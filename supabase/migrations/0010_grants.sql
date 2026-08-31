-- Onda 0 — GRANTs de tabela
--
-- RLS e GRANT sao camadas DIFERENTES e as duas sao necessarias:
--   GRANT  -> o role pode tocar na tabela
--   POLICY -> quais linhas ele enxerga
--
-- Sem GRANT o Postgres recusa ANTES de avaliar a policy, com
-- "permission denied for table X". A migration 0005 criou as policies e
-- faltaram os grants: o app quebrou exatamente aqui, na primeira vez que
-- leu o banco de verdade. Nenhuma analise estatica pegou isso.

grant usage on schema public to anon, authenticated;

-- ─── Catalogo: leitura para todos, escrita para ninguem ──────────────────────
grant select on anatomy_slots, parts, beyblades, beyblade_parts
  to anon, authenticated;

-- ─── Dados do usuario: so autenticado, e so o que a policy deixa ver ─────────
grant select, update         on profiles        to authenticated;
grant select, insert, update, delete on inventory_items to authenticated;

-- combos e combo_parts: SEM insert/update. A gravacao passa por
-- save_combo/update_combo (security definer), porque o trigger diferido exige
-- combo e pecas na mesma transacao e o PostgREST da uma por requisicao.
grant select, delete on combos      to authenticated;
grant select         on combo_parts to authenticated;

-- combo_shares: so leitura. share_combo/revoke_combo_share escrevem.
grant select on combo_shares to authenticated;

-- A view herda o RLS das tabelas base via security_invoker.
grant select on user_parts to authenticated;
