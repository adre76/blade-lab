-- Onda 0 / Task 10 — Row Level Security

alter table anatomy_slots   enable row level security;
alter table parts           enable row level security;
alter table beyblades       enable row level security;
alter table beyblade_parts  enable row level security;
alter table profiles        enable row level security;
alter table inventory_items enable row level security;
alter table combos          enable row level security;
alter table combo_parts     enable row level security;
alter table combo_shares    enable row level security;

-- ─── Catalogo: leitura publica, escrita nenhuma ──────────────────────────────
-- Sem policy de insert/update/delete: so service_role (que ignora RLS) escreve.
-- Nao existe tela de administracao; correcoes entram por SQL no painel.
-- Nomes de policy repetidos entre tabelas sao legais: a unicidade de pg_policy
-- e por (tabela, nome), nao global.
create policy catalogo_leitura_publica on anatomy_slots  for select using (true);
create policy catalogo_leitura_publica on parts          for select using (true);
create policy catalogo_leitura_publica on beyblades      for select using (true);
create policy catalogo_leitura_publica on beyblade_parts for select using (true);

-- ─── Perfil ──────────────────────────────────────────────────────────────────
-- A RLS nao restringe COLUNAS: quem impede alteracao de id/created_at e o
-- trigger touch_profile de 0004.
create policy perfil_leitura_propria on profiles
  for select using (auth.uid() = id);
create policy perfil_escrita_propria on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ─── Inventario ──────────────────────────────────────────────────────────────
create policy inventario_proprio on inventory_items
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ─── Combos: leitura e delete diretos; insert/update so pelas funcoes ────────
-- O trigger de 0004 exige combo e pecas na mesma transacao, e o PostgREST da
-- uma transacao por requisicao. Escrita direta e portanto IMPOSSIVEL: um
-- insert em combos sozinho seria validado sem peca alguma e falharia.
-- Ver save_combo/update_combo em 0006.
create policy combos_leitura_propria on combos
  for select using (auth.uid() = profile_id);
create policy combos_delete_proprio on combos
  for delete using (auth.uid() = profile_id);

create policy combo_parts_leitura_propria on combo_parts
  for select using (
    exists (select 1 from combos c where c.id = combo_id and c.profile_id = auth.uid())
  );

-- ─── combo_shares: leitura propria, escrita nenhuma ──────────────────────────
-- O dono le para exibir o link; so as funcoes de 0006 escrevem.
create policy shares_leitura_propria on combo_shares
  for select using (
    exists (select 1 from combos c where c.id = combo_id and c.profile_id = auth.uid())
  );
