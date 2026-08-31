-- Onda 0 / Task 11 — funcoes publicas (RPC)

-- ─── Gravacao transacional de combos ─────────────────────────────────────────
-- Combo e pecas precisam da MESMA transacao (trigger de 0004). Via PostgREST
-- cada requisicao e uma transacao, entao uma funcao e a unica forma de
-- conseguir isso sem backend proprio.
--
-- ::public.part_slot, nao ::part_slot. Sob search_path = '' o tipo nao e
-- encontrado e a funcao falha com "type part_slot does not exist" — ou seja,
-- nenhum combo poderia ser salvo. ::uuid dispensa qualificacao (pg_catalog).
create function save_combo(
  p_name text, p_anatomy anatomy, p_notes text, p_parts jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_combo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'e necessario estar autenticado';
  end if;

  insert into public.combos (profile_id, name, anatomy, notes)
  values (auth.uid(), p_name, p_anatomy, p_notes)
  returning id into v_combo_id;

  insert into public.combo_parts (combo_id, part_id, slot)
  select v_combo_id, (e->>'part_id')::uuid, (e->>'slot')::public.part_slot
  from jsonb_array_elements(p_parts) as e;

  -- Forca os constraint triggers diferidos a rodarem aqui, e nao no commit:
  -- o erro volta atrelado a esta chamada em vez de vir opaco pelo PostgREST.
  set constraints all immediate;

  return v_combo_id;
end;
$$;

create function update_combo(
  p_combo_id uuid, p_name text, p_anatomy anatomy, p_notes text, p_parts jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.combos
    where id = p_combo_id and profile_id = auth.uid()
  ) then
    raise exception 'combo inexistente ou de outro usuario';
  end if;

  delete from public.combo_parts where combo_id = p_combo_id;

  update public.combos
  set name = p_name, anatomy = p_anatomy, notes = p_notes
  where id = p_combo_id;

  insert into public.combo_parts (combo_id, part_id, slot)
  select p_combo_id, (e->>'part_id')::uuid, (e->>'slot')::public.part_slot
  from jsonb_array_elements(p_parts) as e;

  set constraints all immediate;
end;
$$;

-- ─── Compartilhamento ────────────────────────────────────────────────────────
-- UPSERT, nao insert: a PK e combo_id, e gerar linha nova quebraria a URL ja
-- compartilhada, anulando a razao de is_active existir.
create function share_combo(p_combo_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_slug text;
begin
  if not exists (
    select 1 from public.combos
    where id = p_combo_id and profile_id = auth.uid()
  ) then
    raise exception 'combo inexistente ou de outro usuario';
  end if;

  insert into public.combo_shares (combo_id) values (p_combo_id)
  on conflict (combo_id) do update set is_active = true
  returning slug into v_slug;

  return v_slug;
end;
$$;

create function revoke_combo_share(p_combo_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.combos
    where id = p_combo_id and profile_id = auth.uid()
  ) then
    raise exception 'combo inexistente ou de outro usuario';
  end if;

  update public.combo_shares set is_active = false where combo_id = p_combo_id;
end;
$$;

-- ─── Leitura publica por slug ────────────────────────────────────────────────
-- NAO existe policy de leitura publica em combos: ela permitiria LISTAR todos
-- os combos publicos do site, bem mais amplo que "link secreto opcional".
-- O acesso exige conhecer o slug.
--
-- A coluna de anatomia sai como combo_anatomy (e nao anatomy como no spec 4.7)
-- porque o nome colidiria com o tipo anatomy na declaracao returns table.
-- A onda 4 consome esse nome.
create function get_shared_combo(p_slug text)
returns table (
  combo_name text, combo_anatomy anatomy, notes text,
  author_name text, part_id uuid, slot part_slot
)
language sql stable security definer set search_path = '' as $$
  select c.name, c.anatomy, c.notes, pr.display_name, cp.part_id, cp.slot
  from public.combo_shares sh
  join public.combos      c  on c.id = sh.combo_id
  join public.profiles    pr on pr.id = c.profile_id
  join public.combo_parts cp on cp.combo_id = c.id
  where sh.slug = p_slug and sh.is_active;
$$;

-- REVOGAR DE PUBLIC, nao so de anon. O Postgres concede EXECUTE a PUBLIC por
-- padrao no create function; revogar apenas de anon deixa o privilegio
-- herdado por PUBLIC intacto, e has_function_privilege('anon', ...) continua
-- TRUE. Depois de revogar de PUBLIC e preciso reconceder a authenticated.
revoke execute on function public.save_combo(text, anatomy, text, jsonb)
  from public, anon;
revoke execute on function public.update_combo(uuid, text, anatomy, text, jsonb)
  from public, anon;
revoke execute on function public.share_combo(uuid)              from public, anon;
revoke execute on function public.revoke_combo_share(uuid)       from public, anon;

grant execute on function public.save_combo(text, anatomy, text, jsonb)
  to authenticated;
grant execute on function public.update_combo(uuid, text, anatomy, text, jsonb)
  to authenticated;
grant execute on function public.share_combo(uuid)               to authenticated;
grant execute on function public.revoke_combo_share(uuid)        to authenticated;

grant execute on function public.get_shared_combo(text) to anon, authenticated;
