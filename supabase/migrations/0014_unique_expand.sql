-- UX Expand Blade — a lamina que traz o ratchet integrado
--
-- "Expand Blade" nao e uma linha: e um sub-sistema que atravessa as tres.
-- Na CX ele divide a Main Blade em Metal Blade + Over Blade (o custom_expand
-- que ja existe aqui); na UX ele INTEGRA o ratchet na lamina, deixando o bey
-- com duas pecas em vez de tres; na BX so poe mais metal no centro, sem mudar
-- a composicao — por isso nao ganha anatomia propria.
--
-- Sao tres produtos Takara Tomy: UX-19 BulletGriffon H, UX-20 GloryValkyrie LF
-- e UX-21 HellsNether Z.
--
-- Por que um SLOT proprio, e nao um 'blade' com uma marca de "tem ratchet":
-- a peca ocupa fisicamente as posicoes de lamina E de ratchet. Com slot
-- proprio, anatomy_slots torna estruturalmente impossivel o laboratorio
-- oferecer um ratchet para acompanha-la — a regra vira o formato do dado, em
-- vez de uma verificacao que alguem precisa lembrar de escrever.
--
-- ADD VALUE fica sozinho nesta migration de proposito: um valor de enum
-- recem-criado nao pode ser USADO na mesma transacao que o criou. Quem popula
-- anatomy_slots e o scripts/sync-anatomies.ts, depois.

alter type part_slot add value if not exists 'integrated_blade' after 'blade';
alter type anatomy   add value if not exists 'unique_expand'    after 'unique';
