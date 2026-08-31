-- Onda 2 — isolamento do inventário entre usuários.
--
-- Esta é a primeira vez que o banco guarda dado PRIVADO. "A policy existe" não
-- é "o isolamento funciona" — os grants já ensinaram isso duas vezes neste
-- projeto (Onda 0 com `anon`, Onda 1 com `service_role`). Aqui o teste
-- exercita dois usuários reais em vez de ler as policies e supor.
--
-- Roda inteiro dentro de uma transação que termina em rollback.
-- Qualquer mensagem começando com FALHA indica regra quebrada.
--
-- RESULTADO ESPERADO: 'RLS do inventario: todas as verificacoes passaram'

begin;

do $$
declare
  ana  uuid := gen_random_uuid();
  bruno uuid := gen_random_uuid();
  bey_a uuid; bey_b uuid;
  visto int; qtd int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ana,   'ana@exemplo.com',   '{"full_name":"Ana"}'::jsonb),
         (bruno, 'bruno@exemplo.com', '{"full_name":"Bruno"}'::jsonb);

  select id into bey_a from beyblades where release_code = 'BX-01' limit 1;
  select id into bey_b from beyblades where release_code = 'BX-02' limit 1;

  insert into inventory_items (profile_id, beyblade_id, quantity, status)
  values (ana, bey_a, 3, 'owned'), (bruno, bey_b, 1, 'owned');

  -- ─── Ana enxerga só o dela ─────────────────────────────────────────────
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', ana)::text, true);

  select count(*) into visto from inventory_items;
  if visto <> 1 then raise exception 'FALHA: Ana ve % itens, deveria ver 1', visto; end if;
  if not exists (select 1 from inventory_items where beyblade_id = bey_a) then
    raise exception 'FALHA: Ana nao ve o proprio item';
  end if;

  -- A view herda o RLS via security_invoker (spec §4.9). Sem ele, vazaria o
  -- estoque de TODOS os usuarios — e e o estoque que o laboratorio consome.
  select count(*) into visto from user_parts;
  if visto <> 3 then
    raise exception 'FALHA: user_parts devolveu % linhas para Ana, esperado 3', visto;
  end if;
  select quantity into qtd from user_parts limit 1;
  if qtd <> 3 then raise exception 'FALHA: estoque derivado veio %, esperado 3', qtd; end if;

  -- ─── Bruno enxerga só o dele ───────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', bruno)::text, true);
  select count(*) into visto from inventory_items;
  if visto <> 1 then raise exception 'FALHA: Bruno ve % itens, deveria ver 1', visto; end if;
  if exists (select 1 from inventory_items where beyblade_id = bey_a) then
    raise exception 'FALHA GRAVE: Bruno enxerga o inventario da Ana';
  end if;
  if exists (select 1 from user_parts where quantity = 3) then
    raise exception 'FALHA GRAVE: user_parts vazou o estoque da Ana para Bruno';
  end if;

  begin
    insert into inventory_items (profile_id, beyblade_id) values (ana, bey_b);
    raise exception 'FALHA GRAVE: Bruno gravou no inventario da Ana';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;

  reset role;

  -- ─── Constraints do inventário ─────────────────────────────────────────
  begin
    insert into inventory_items (profile_id, beyblade_id, status)
    values (ana, bey_a, 'wishlist');
    raise exception 'FALHA: o mesmo bey foi aceito como owned E wishlist';
  exception when others then
    if sqlerrm like 'FALHA:%' then raise; end if;
  end;

  begin
    insert into inventory_items (profile_id, beyblade_id, status, quantity)
    values (ana, bey_b, 'wishlist', 5);
    raise exception 'FALHA: wishlist aceitou quantidade 5';
  exception when others then
    if sqlerrm like 'FALHA:%' then raise; end if;
  end;
end $$;

-- ─── Anônimo: barrado antes mesmo da policy ──────────────────────────────
-- Bloco separado porque o erro de permissão aborta a transação inteira, e
-- capturá-lo dentro do bloco acima invalidaria as verificações seguintes.
--
-- Descoberta ao escrever este teste: esperávamos que o anônimo enxergasse
-- ZERO linhas (policy filtrando). Na verdade ele recebe
-- `insufficient_privilege` — não há GRANT de inventory_items para `anon`,
-- então ele nem chega à policy. A proteção é mais forte do que a policy
-- sozinha: são duas camadas, e a de fora já barra.
do $$
declare visto int;
begin
  set local role anon;
  begin
    select count(*) into visto from inventory_items;
    raise exception 'FALHA GRAVE: anonimo conseguiu ler inventory_items (% itens)', visto;
  exception
    when insufficient_privilege then null;  -- esperado
    when others then if sqlerrm like 'FALHA%' then raise; end if;
  end;
  reset role;
end $$;

rollback;

select 'RLS do inventario: todas as verificacoes passaram' as resultado;
