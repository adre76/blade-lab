-- Onda 1 — procedencia da imagem, separada da procedencia do dado.
--
-- source_url diz de onde vieram os ATRIBUTOS; image_source_url diz de onde
-- veio a ARTE. Sao coisas diferentes e podem ter fontes diferentes.
--
-- Existe por uma razao concreta: o spec 10 assume o risco de usar arte oficial
-- da Takara Tomy/Hasbro em catalogo de fas, e a pagina /creditos promete
-- remocao mediante pedido. Sem registrar a origem de cada arquivo, atender a
-- esse pedido viraria caca manual no bucket.

alter table parts     add column image_source_url text;
alter table beyblades add column image_source_url text;

comment on column parts.image_source_url is
  'URL de onde a imagem foi baixada. Distinta de source_url, que e a fonte dos atributos.';
comment on column beyblades.image_source_url is
  'URL de onde a imagem foi baixada. Distinta de source_url, que e a fonte dos atributos.';
