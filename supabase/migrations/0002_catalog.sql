-- Onda 0 / Task 7 — catalogo
--
-- anatomy_slots e a fonte de verdade da composicao de cada anatomia, usada
-- pelo trigger de validade de combo (0004) e pelo teste de integridade.
-- E sincronizada DESTRUTIVAMENTE pelo seed (spec 4.3): linha obsoleta aqui
-- faria o banco aceitar combo com slot que a anatomia nao tem mais.

create table anatomy_slots (
  anatomy anatomy   not null,
  slot    part_slot not null,
  primary key (anatomy, slot)
);

create table parts (
  id               uuid primary key default gen_random_uuid(),
  slot             part_slot    not null,
  brand            brand        not null default 'takara_tomy',
  name             text         not null,   -- "Dran Sword", "3-60", "Flat"
  code             text,                    -- notacao curta quando existir
  line             product_line not null,   -- linha em que a peca estreou
  attack           smallint     not null default 0,
  defense          smallint     not null default 0,
  stamina          smallint     not null default 0,
  weight_g         numeric(5,2),
  height_mm        numeric(4,1),            -- apenas ratchets
  contact_points   smallint,                -- o "3" de "3-60" — exibicao apenas
  burst_resistance resistance,
  dash_performance resistance,              -- bits — exibicao apenas
  spin_direction   spin_direction,          -- APENAS a lamina principal
  part_type        bey_type,
  equivalent_id    uuid references parts(id) on delete restrict,
  image_path       text,
  source_url       text         not null,
  notes            text,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  unique (brand, slot, name),
  unique (id, slot),                        -- alvo da FK composta
  check (equivalent_id is null or equivalent_id <> id)
);

create table beyblades (
  id            uuid         primary key default gen_random_uuid(),
  release_code  text         not null,      -- "BX-34", "UX-07", "CX-05"
  name          text         not null,      -- "Dran Sword 3-60F"
  line          product_line not null,
  anatomy       anatomy      not null,
  brand         brand        not null default 'takara_tomy',
  release_type  release_type not null,
  release_date  date,
  rarity        rarity       not null default 'common',
  bey_type      bey_type,
  equivalent_id uuid references beyblades(id) on delete restrict,
  image_path    text,
  source_url    text         not null,
  notes         text,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  unique (brand, release_code, name),
  check (equivalent_id is null or equivalent_id <> id)
);

-- A FK COMPOSTA (part_id, slot) e o que impede, no proprio banco, que um bey
-- declare um bit no slot de ratchet. Sem ela a consistencia dependeria so do
-- teste de seed. on delete restrict em todo o catalogo e deliberado: como a
-- manutencao e por SQL no painel, apagar peca referenciada deve falhar de
-- forma barulhenta em vez de destruir combos de usuarios.
create table beyblade_parts (
  beyblade_id uuid      not null references beyblades(id) on delete cascade,
  part_id     uuid      not null,
  slot        part_slot not null,
  primary key (beyblade_id, slot),
  foreign key (part_id, slot) references parts(id, slot) on delete restrict
);

-- Indices para os filtros do catalogo (onda 1).
-- beyblade_parts_part_idx cobre a consulta inversa "quais beys contem esta
-- peca", usada no caminho peca -> wishlist (spec 4.9) e na rota /peca/:id.
create index parts_slot_brand_idx     on parts (slot, brand);
create index beyblades_line_idx       on beyblades (line, brand);
create index beyblades_rarity_idx     on beyblades (rarity);
create index beyblade_parts_part_idx  on beyblade_parts (part_id);
