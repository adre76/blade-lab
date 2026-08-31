-- Onda 1 — marca registros cujos valores DIVERGEM entre as fontes públicas.
--
-- Contexto: todo o catálogo já é medição de comunidade, não folha oficial da
-- Takara Tomy — isso está dito em /creditos e vale para tudo. O que esta
-- coluna acrescenta é mais específico: "as fontes NÃO CONCORDAM entre si".
--
-- A alternativa considerada era deixar o campo nulo quando houvesse
-- divergência. Foi descartada: esconde informação que temos. Melhor registrar
-- o valor mais citado, marcar como divergente e detalhar em `notes`
-- ("55 em byybladebuilder, 57 em beybxdb").
--
-- Booleano em vez de texto livre porque precisa ser FILTRÁVEL: sem coluna
-- própria, não há como listar "tudo que precisa de revisão" nem sinalizar na
-- interface.

alter table parts     add column data_disputed boolean not null default false;
alter table beyblades add column data_disputed boolean not null default false;

comment on column parts.data_disputed is
  'true quando as fontes divergem sobre este registro; o detalhe fica em notes';
comment on column beyblades.data_disputed is
  'true quando as fontes divergem sobre este registro; o detalhe fica em notes';

-- Índice parcial: a consulta útil é "o que precisa de revisão", e ela devolve
-- poucas linhas. Indexar só as verdadeiras mantém o índice minúsculo.
create index parts_disputed_idx     on parts (id)     where data_disputed;
create index beyblades_disputed_idx on beyblades (id) where data_disputed;
