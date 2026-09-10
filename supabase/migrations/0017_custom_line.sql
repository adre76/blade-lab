-- Custom Line — a ponta que traz a catraca, e dois comentarios que envelheceram
--
-- integrated_bit e o espelho de baixo do integrated_blade: onde a UX integrou
-- a catraca na LAMINA, a CX integrou na PONTA. Confirmado em PegasusBlast ATr
-- (CX-07) e EmperorMight HOp (CX-11), cujos infoboxes declaram RatchetBit e
-- nao declaram Ratchet.
--
-- custom_integrated e nome CUNHADO POR NOS: a wiki batiza o "Expand Blade" e
-- nao batiza esta variante. Registrado aqui para ninguem procurar a fonte.
--
-- ADD VALUE fica sozinho nesta migration pelo mesmo motivo da 0014: um valor
-- de enum recem-criado nao pode ser USADO na mesma transacao que o criou.
-- Quem popula anatomy_slots e o scripts/sync-anatomies.ts, depois.

alter type part_slot add value if not exists 'integrated_bit'    after 'bit';
alter type anatomy   add value if not exists 'custom_integrated' after 'custom_expand';

-- A coluna passou a valer para mais de um slot: o Assist Blade da CX publica
-- HeightStat, e a integrated_blade/integrated_bit trazem a catraca embutida.
-- Qual delas define a altura do COMBO e decisao do motor (SLOTS_DE_ALTURA),
-- nao do schema.
comment on column parts.height_mm is
  'Altura propria da peca em mm. Catracas, pecas com catraca embutida e Assist Blades.';

-- Alargado: o caso que motivou a coluna era "as fontes divergem", mas existe um
-- terceiro estado — a fonte nao publica nada, e a classe da peca pontua. O
-- indice parcial ja existe para responder "o que precisa de revisao", e os dois
-- casos precisam.
comment on column parts.data_disputed is
  'true quando este registro precisa de revisao: as fontes divergem OU nao publicam o dado. O detalhe fica em notes';
