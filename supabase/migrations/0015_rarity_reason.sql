-- Por que este bey e raro
--
-- A etiqueta de raridade diz QUANTO; esta coluna diz POR QUE, em uma frase que
-- o leitor entende:
--
--   "Saem 3 a cada caixa de 24 do BX-14 Random Booster Vol. 1, contra 5 do
--    mais comum da mesma caixa."
--   "So por encomenda direta, fora do varejo."
--
-- Coluna propria, e nao `notes`, por duas razoes. `notes` ja carrega outra
-- coisa — a procedencia de um dado especifico do registro — e as telas
-- exibiriam os dois textos emendados, sem hierarquia. E porque isto precisa
-- aparecer em lugar proprio na ficha, do lado da etiqueta que explica.
--
-- Nula em bey de compra garantida: quem compra um Starter sabe o que vem, e
-- nao ha nada a explicar. So tem valor onde rarity <> 'common'.

alter table beyblades add column if not exists rarity_reason text;

comment on column beyblades.rarity_reason is
  'Frase que explica a raridade ao leitor. Nula quando rarity = common.';
