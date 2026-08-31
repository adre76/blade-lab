-- Onda 0 / Task 14 — verificacoes executaveis das regras do banco
--
-- Executar pelo MCP ou pelo SQL Editor. Cada bloco levanta excecao se a regra
-- nao valer. Roda inteiro dentro de uma transacao que termina em rollback:
-- nao suja dados.
--
-- Se a ferramenta ja abrir transacao propria, o `begin;` inicial produz
-- "WARNING: there is already a transaction in progress". E inofensivo.
--
-- Qualquer mensagem comecando com FALHA: indica regra quebrada — corrija a
-- migration correspondente e reaplique. Estas cinco verificacoes existem
-- porque cada uma corresponde a um defeito real encontrado em revisao.

begin;

-- 1. Combo incompleto deve ser rejeitado ------------------------------------
do $$
declare
  v_user uuid := gen_random_uuid();
  v_combo uuid;
  v_blade uuid;
begin
  insert into auth.users (id, email) values (v_user, 'teste@exemplo.com');
  -- o trigger handle_new_user ja criou o profile

  insert into parts (slot, name, line, source_url)
  values ('blade', 'Teste Blade', 'BX', 'http://exemplo') returning id into v_blade;

  begin
    insert into combos (profile_id, name, anatomy)
    values (v_user, 'incompleto', 'basic') returning id into v_combo;
    insert into combo_parts (combo_id, part_id, slot) values (v_combo, v_blade, 'blade');

    -- SET CONSTRAINTS ALL IMMEDIATE e IMPRESCINDIVEL aqui.
    -- Constraint triggers DEFERRABLE INITIALLY DEFERRED so disparam no commit
    -- da transacao real. Um bloco BEGIN...EXCEPTION do PL/pgSQL e apenas uma
    -- subtransacao: ao liberar o savepoint, os eventos pendentes sao
    -- TRANSFERIDOS para a transacao pai, nao executados. Sem esta linha o
    -- raise abaixo seria sempre alcancado e o teste REPROVARIA um schema
    -- correto, abortando a suite antes dos checks 2 a 5.
    set constraints all immediate;

    raise exception 'FALHA: combo incompleto foi aceito';
  exception
    when others then
      if sqlerrm like 'FALHA:%' then raise; end if;
  end;
end $$;

-- 2. gen_share_slug tem 12 caracteres do alfabeto esperado -------------------
do $$
declare s text := gen_share_slug();
begin
  if length(s) <> 12 then
    raise exception 'FALHA: slug com % caracteres, esperado 12', length(s);
  end if;
  if s !~ '^[23456789abcdefghjkmnpqrstuvwxyz]{12}$' then
    raise exception 'FALHA: slug fora do alfabeto: %', s;
  end if;
end $$;

-- 3. profiles rejeita alteracao de campo imutavel ----------------------------
do $$
declare
  v_user uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_user, 'imutavel@exemplo.com');
  begin
    update profiles set created_at = now() - interval '1 year' where id = v_user;
    raise exception 'FALHA: created_at pode ser alterado';
  exception
    when others then
      if sqlerrm like 'FALHA:%' then raise; end if;
  end;
  -- mas o nome muda normalmente
  update profiles set display_name = 'Novo Nome' where id = v_user;
end $$;

-- 4. FK composta impede peca em slot errado ----------------------------------
do $$
declare
  v_bit uuid;
  v_bey uuid;
begin
  insert into parts (slot, name, line, source_url)
  values ('bit', 'Teste Bit', 'BX', 'http://exemplo') returning id into v_bit;

  insert into beyblades (release_code, name, line, anatomy, release_type, source_url)
  values ('BX-TEST', 'Teste', 'BX', 'basic', 'booster', 'http://exemplo')
  returning id into v_bey;

  begin
    insert into beyblade_parts (beyblade_id, part_id, slot)
    values (v_bey, v_bit, 'ratchet');   -- bit no slot de ratchet
    raise exception 'FALHA: FK composta nao impediu peca em slot errado';
  exception
    when foreign_key_violation then null;
    when others then if sqlerrm like 'FALHA:%' then raise; end if;
  end;
end $$;

-- 5. user_parts resolve equivalencia Hasbro ---------------------------------
-- A verificacao mais valiosa da suite: e o bug que, em producao, apareceria
-- como "o app diz que eu nao tenho uma peca que eu tenho".
do $$
declare
  v_user uuid := gen_random_uuid();
  v_tt uuid; v_hasbro uuid; v_bey uuid; v_qtd int;
begin
  insert into auth.users (id, email) values (v_user, 'hasbro@exemplo.com');

  insert into parts (slot, name, line, brand, source_url)
  values ('blade', 'Dran Sword', 'BX', 'takara_tomy', 'http://exemplo')
  returning id into v_tt;

  insert into parts (slot, name, line, brand, equivalent_id, source_url)
  values ('blade', 'Dran Sword HAS', 'BX', 'hasbro', v_tt, 'http://exemplo')
  returning id into v_hasbro;

  insert into beyblades (release_code, name, line, anatomy, brand, release_type, source_url)
  values ('HAS-1', 'Bey Hasbro', 'BX', 'basic', 'hasbro', 'booster', 'http://exemplo')
  returning id into v_bey;

  insert into beyblade_parts (beyblade_id, part_id, slot) values (v_bey, v_hasbro, 'blade');
  insert into inventory_items (profile_id, beyblade_id, quantity) values (v_user, v_bey, 2);

  select quantity into v_qtd from user_parts
  where profile_id = v_user and part_id = v_tt;

  if v_qtd is distinct from 2 then
    raise exception 'FALHA: user_parts nao resolveu Hasbro para canonical (v_qtd=%)', v_qtd;
  end if;
end $$;

rollback;
