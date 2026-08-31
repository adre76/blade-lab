-- Onda 0 / Task 12 — view de pecas do usuario
--
-- O usuario registra beys, nunca pecas soltas. O estoque de pecas disponiveis
-- para montagem sai do inventario de beys: possuir duas copias de
-- "Dran Sword 3-60F" significa possuir dois blades Dran Sword, dois ratchets
-- 3-60 e dois bits F.
--
-- DUAS COISAS OBRIGATORIAS AQUI, ambas encontradas em revisao:
--
-- 1. security_invoker = true. Sem ele a view roda com os privilegios do
--    criador e VAZA O INVENTARIO DE TODOS OS USUARIOS, ignorando o RLS da
--    tabela base.
--
-- 2. O coalesce(p.equivalent_id, bp.part_id) resolve Hasbro -> canonical.
--    Sem ele, um bey Hasbro no inventario faria o laboratorio afirmar que o
--    usuario NAO POSSUI uma peca que possui, porque compararia o part_id
--    Hasbro com o canonical usado na montagem. Nao e detalhe da onda 6.

create view user_parts with (security_invoker = true) as
select
  i.profile_id,
  coalesce(p.equivalent_id, bp.part_id) as part_id,
  bp.slot,
  sum(i.quantity)::int as quantity
from inventory_items i
join beyblade_parts bp on bp.beyblade_id = i.beyblade_id
join parts          p  on p.id = bp.part_id
where i.status = 'owned'
group by i.profile_id, coalesce(p.equivalent_id, bp.part_id), bp.slot;
