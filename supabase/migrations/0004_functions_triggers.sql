-- Onda 0 / Task 9 — funcoes e triggers de integridade
--
-- ESTA E A MIGRATION MAIS DELICADA DO PROJETO. As tres armadilhas abaixo
-- foram encontradas em revisao e estao documentadas no spec 4.6.
-- NAO "simplifique" nenhuma delas: cada uma parece redundante e nao e.

create extension if not exists pgcrypto with schema extensions;

-- ─── Slug de compartilhamento ────────────────────────────────────────────────
-- 12 caracteres de alfabeto sem ambiguidade visual (sem 0 1 i l o).
-- ~59,5 bits de entropia. Ha vies de modulo leve (256 % 31 = 8, entao os 8
-- primeiros caracteres do alfabeto sao um pouco mais provaveis); irrelevante
-- para um link secreto, mas registrado para nao afirmar uniformidade falsa.
--
-- ARMADILHA 1: set search_path = '' + qualificacao de gen_random_bytes sao
-- OBRIGATORIOS. Esta funcao e chamada pelo default da coluna a partir de
-- share_combo, que roda com search_path vazio. Sem qualificar, falha com
-- "function gen_random_bytes(integer) does not exist" na primeira tentativa
-- de compartilhar — e de forma intermitente, porque o plano e cacheado por
-- sessao. Testar "select gen_share_slug()" no SQL Editor NAO pega esse bug,
-- porque ali o search_path e normal.
create function gen_share_slug() returns text
language sql volatile set search_path = '' as $$
  select string_agg(
    substr('23456789abcdefghjkmnpqrstuvwxyz', (get_byte(b, i) % 31) + 1, 1), ''
  )
  from (select extensions.gen_random_bytes(12) as b) s, generate_series(0, 11) as i;
$$;

alter table combo_shares alter column slug set default gen_share_slug();

-- ─── updated_at generico ─────────────────────────────────────────────────────
create function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger parts_set_updated_at      before update on parts
  for each row execute function set_updated_at();
create trigger beyblades_set_updated_at  before update on beyblades
  for each row execute function set_updated_at();
create trigger inventory_set_updated_at  before update on inventory_items
  for each row execute function set_updated_at();
create trigger combos_set_updated_at     before update on combos
  for each row execute function set_updated_at();

-- ─── Perfil: criacao automatica ──────────────────────────────────────────────
-- Nasce no banco, por trigger, para que nao exista janela em que um usuario
-- autenticado nao tenha perfil e o inventario falhe.
-- O coalesce termina em literal porque display_name e not null: conta sem nome
-- e sem e-mail nao pode derrubar o cadastro.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Blader'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Perfil: updated_at + imutabilidade no MESMO trigger ─────────────────────
-- ARMADILHA 2: separar as duas responsabilidades e armadilha. Triggers BEFORE
-- disparam em ordem alfabetica do nome, e o de imutabilidade veria o
-- updated_at recem-alterado pelo outro como campo proibido, rejeitando TODA
-- atualizacao — inclusive a troca de nome, que e legitima. Fundidos, a ordem
-- deixa de importar.
create function touch_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'campo imutavel em profiles';
  end if;
  new.updated_at := now();   -- ignora o valor enviado pelo cliente
  return new;
end;
$$;

create trigger profiles_before_update
  before update on profiles
  for each row execute function touch_profile();

-- ─── Validade do combo ───────────────────────────────────────────────────────
-- ARMADILHA 3: NEW nao e atribuido em DELETE e OLD nao e atribuido em INSERT.
-- Escrever coalesce(new.combo_id, old.combo_id) parece equivalente e NAO E: a
-- substituicao dos registros ocorre ANTES da avaliacao do coalesce, e a funcao
-- falha em toda escrita com "record is not assigned yet". Na pratica, nenhum
-- combo poderia ser salvo. Decidir por TG_OP antes de tocar no registro.
--
-- set search_path = '' e seguro aqui porque todas as tabelas estao
-- qualificadas com public. e nenhuma funcao fora de pg_catalog e chamada.
create function validate_combo_slots() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_combo_id uuid;
begin
  if TG_TABLE_NAME = 'combos' then
    v_combo_id := new.id;
  elsif TG_OP = 'DELETE' then
    v_combo_id := old.combo_id;
  else
    v_combo_id := new.combo_id;
  end if;

  if exists (
    select 1 from public.combos c
    where c.id = v_combo_id
      and (
        select array_agg(cp.slot order by cp.slot) from public.combo_parts cp
        where cp.combo_id = c.id
      ) is distinct from (
        select array_agg(s.slot order by s.slot) from public.anatomy_slots s
        where s.anatomy = c.anatomy
      )
  ) then
    raise exception 'combo incompleto ou com slot invalido para a anatomia';
  end if;
  return null;
end;
$$;

-- DOIS triggers, um sobre cada tabela. So o de combo_parts deixaria passar:
--   (a) insert into combos SEM peca alguma — nenhum trigger dispararia, e o
--       combo vazio persistiria, servido por get_shared_combo como zero linhas,
--       indistinguivel de link invalido;
--   (b) update combos set anatomy = ... invalidando combo ja salvo sem tocar
--       em combo_parts.
--
-- deferrable initially deferred faz a validacao rodar no commit, e por isso
-- EXIGE que combo e pecas cheguem na mesma transacao. Via PostgREST cada
-- requisicao e uma transacao, entao a escrita direta e impossivel: e por isso
-- que 0005 nao da policy de insert/update e 0006 traz save_combo/update_combo.
create constraint trigger combo_parts_must_match_anatomy
  after insert or update or delete on combo_parts
  deferrable initially deferred
  for each row execute function validate_combo_slots();

create constraint trigger combo_must_be_complete
  after insert or update on combos
  deferrable initially deferred
  for each row execute function validate_combo_slots();
