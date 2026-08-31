-- Onda 0 / Task 8 — dados do usuario
--
-- combo_shares.slug nasce sem default: gen_share_slug() so existe em 0004,
-- que acrescenta o default com alter table. Mover a funcao para 0001
-- misturaria funcao com tipos.

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- unique (profile_id, beyblade_id) SEM status: possuido e desejado sao
-- mutuamente exclusivos (spec 4.5). Marcar como adquirido um bey da wishlist
-- e um update de status, nao uma linha nova.
create table inventory_items (
  id          uuid     primary key default gen_random_uuid(),
  profile_id  uuid     not null references profiles(id) on delete cascade,
  beyblade_id uuid     not null references beyblades(id) on delete restrict,
  quantity    smallint not null default 1 check (quantity > 0),
  status      inventory_status not null default 'owned',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, beyblade_id),
  check (status = 'owned' or quantity = 1)
);

-- anatomy e gravada explicitamente em vez de inferida do conjunto de slots:
-- inferir seria ambiguo durante a montagem, com o combo parcialmente cheio.
create table combos (
  id         uuid    primary key default gen_random_uuid(),
  profile_id uuid    not null references profiles(id) on delete cascade,
  name       text    not null,
  anatomy    anatomy not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table combo_parts (
  combo_id uuid      not null references combos(id) on delete cascade,
  part_id  uuid      not null,
  slot     part_slot not null,
  primary key (combo_id, slot),
  foreign key (part_id, slot) references parts(id, slot) on delete restrict
);

-- O compartilhamento mora em tabela separada, e nao em colunas de combos,
-- por SEGURANCA: o usuario tem escrita propria em combos, e uma coluna
-- share_slug ali seria gravavel pelo cliente — nada impediria alguem de
-- definir slug = 'combo1', destruindo o segredo do link. combo_shares nao
-- tem policy de escrita (0005): so as funcoes de 0006 a alteram.
--
-- is_active separa "existe um link" de "o link funciona": revogar e
-- republicar mantem a URL ja compartilhada em vez de quebra-la.
create table combo_shares (
  combo_id   uuid    primary key references combos(id) on delete cascade,
  slug       text    not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index inventory_profile_idx  on inventory_items (profile_id, status);
create index inventory_beyblade_idx on inventory_items (beyblade_id);
create index combos_profile_idx     on combos (profile_id);
