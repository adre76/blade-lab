-- Nomes alternativos da peca
--
-- O catalogo e Takara Tomy, mas metade de quem procura sabe o nome Hasbro:
-- 'Keel Shark' e a SharkEdge, 'Talon Ptera' e a PteraSwing, 'Bite Croc' e a
-- CrocoCrunch. Sem isto, essas buscas nao achavam nada -- e o usuario bateu
-- nas duas primeiras no mesmo dia.
--
-- Sao 52 das 80 laminas. Ratchets e bits nao entram: as duas marcas usam os
-- mesmos nomes ('3-60', 'Flat').
--
-- Lista, e nao texto: tres pecas tem mais de um nome alternativo. A Tricera
-- Spiky, por exemplo, saiu como 'Ridge Triceratops' na Hasbro e como
-- 'Mosasaurus' na repintura Jurassic World -- as duas sao nomes que alguem
-- pode digitar.
--
-- NAO confundir com `equivalent_id`, que aponta de uma peca Hasbro para a
-- Takara Tomy equivalente: ali sao DUAS pecas, dois registros. Aqui e uma peca
-- so, com mais de um nome.

alter table parts add column if not exists aka text[];

comment on column parts.aka is
  'Outros nomes da MESMA peca (Hasbro, repintura de colaboracao). Alimenta a busca e a ficha.';
