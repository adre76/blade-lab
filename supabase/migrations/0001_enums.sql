-- Onda 0 / Task 6 — tipos enumerados
--
-- A ordem de declaracao de rarity e resistance E SIGNIFICATIVA (spec 4.2):
-- ambas sao comparadas por ordem de enum (4.9 ordena por raridade crescente,
-- 5.3 tira o minimo de resistance). Valores futuros vao nas EXTREMIDADES;
-- inserir no meio muda essas ordenacoes silenciosamente.

create type part_slot as enum (
  'lock_chip', 'main_blade', 'metal_blade', 'over_blade', 'assist_blade',
  'blade', 'ratchet', 'bit'
);
create type anatomy          as enum ('basic', 'unique', 'custom', 'custom_expand');
create type product_line     as enum ('BX', 'UX', 'CX');
create type brand            as enum ('takara_tomy', 'hasbro');
create type spin_direction   as enum ('right', 'left', 'dual');
create type bey_type         as enum ('attack', 'defense', 'stamina', 'balance');
create type rarity           as enum ('common','uncommon','rare','very_rare','exclusive');
create type release_type     as enum ('starter','booster','random_booster','deck_set',
                                      'custom_set','limited','event_exclusive','other');
create type resistance       as enum ('very_low','low','medium','high','very_high');
create type inventory_status as enum ('owned', 'wishlist');
