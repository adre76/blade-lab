# Onda 0 — Fundação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Blade X Lab repo end to end — scaffold, database schema with RLS, theming, PWA shell — and get a working "Hello, Supabase" page live on Vercel.

**Architecture:** Vite + React 19 + TypeScript SPA, no backend of its own; the client talks to Supabase directly through `supabase-js` under RLS. Schema and RLS ship as versioned SQL migrations applied through the hosted Supabase MCP server. `theme.ts` centralizes inline styles (no CSS framework). Vitest covers non-UI logic only.

**Tech Stack:** React 19, Vite 6, TypeScript 5, `@supabase/supabase-js`, `vite-plugin-pwa`, Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`

## Global Constraints

- TypeScript everywhere in `src/` (design §3, deviation from Trocação justified by the variable-slot schema and calc engine).
- No CSS framework — styling lives in `theme.ts` and inline `style` props, following Trocação (design §3).
- All enum values and other stored data are in English; interface copy is pt-BR (design §4.2).
- Catalog tables (`parts`, `beyblades`, `beyblade_parts`) are writable only by `service_role` — no INSERT/UPDATE/DELETE policy for `anon`/`authenticated` (design §4.8).
- Every view that reads user data must be `security_invoker = true` (design §4.6).
- `updated_at` is maintained by a `before update` trigger, never by client code (design §4.5).
- Supabase project ref is `gbcpfsczjivtwkyheihu` (BLADEXLAB, us-east-1) — never point migrations or env vars at any other project (spec header).
- Database access for schema work goes through the hosted Supabase MCP server, scoped with `project_ref` (design "Decisões tomadas" table) — not a locally installed `supabase` CLI (none is installed in this environment).

---

## Prerequisite (manual, before Task 1)

The Supabase MCP server is not yet registered for this project. This is a Claude Code CLI configuration change, not a repo change, so it must be run once by a human (or an agent with a shell) **outside** the current session, then the session reconnected:

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=gbcpfsczjivtwkyheihu"
```

After adding it, restart/reconnect the Claude Code session and confirm the tools are visible with `ToolSearch({query: "select:mcp__supabase__list_tables", max_results: 5})` (or a keyword search like `"supabase"` if the exact name differs — tool names vary slightly by MCP server version; discover them, don't guess). Tasks 5–8 below depend on this.

---

### Task 1: Scaffold the Vite + React + TS project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `.gitignore`

**Interfaces:**
- Produces: an `App` React component exported as default from `src/App.tsx`, mounted by `src/main.tsx`. Later tasks (2, 4, 9) edit `App.tsx` and add siblings under `src/`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "blade-x-lab",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: Write `tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blade X Lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: Write a placeholder `src/App.tsx`** (Task 9 replaces the body with the Supabase connectivity check)

```tsx
export default function App() {
  return <div>Blade X Lab</div>;
}
```

- [ ] **Step 9: Write `.gitignore`**

```
node_modules
dist
dist-ssr
*.local
.env
.env.local
.vercel
```

- [ ] **Step 10: Install dependencies and verify the dev build**

Run: `npm install`
Run: `npm run build`
Expected: build succeeds, producing `dist/`.

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html src .gitignore package-lock.json
git commit -m "chore: scaffold Vite + React + TS project"
```

---

### Task 2: `theme.ts` — central palette and design tokens

**Files:**
- Create: `src/theme.ts`

**Interfaces:**
- Produces: `theme` (default export) with shape `{ colors, byType, spacing, radius, font }`, and a named export `isHexColor(value: string): boolean`. Task 3 tests `isHexColor` and the palette; Task 9 consumes `theme.colors`.

- [ ] **Step 1: Write `src/theme.ts`**

```ts
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

const colors = {
  background: '#12121a',
  surface: '#1c1c28',
  surfaceAlt: '#262636',
  border: '#33334a',
  text: '#f2f2f7',
  textMuted: '#9a9ab0',
  primary: '#7c5cff',
  primaryText: '#ffffff',
  success: '#3ecf8e',
  error: '#ff5c5c',
} as const;

// Um acento por bey_type (design §4.2), usado em badges e barras do laboratório.
const byType = {
  attack: '#ff5c5c',
  defense: '#4d8dff',
  stamina: '#3ecf8e',
  balance: '#c77cff',
} as const;

const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '40px',
} as const;

const radius = {
  sm: '6px',
  md: '12px',
  lg: '20px',
} as const;

const font = {
  family: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  size: {
    sm: '13px',
    md: '15px',
    lg: '20px',
    xl: '28px',
  },
} as const;

const theme = { colors, byType, spacing, radius, font };

export default theme;
```

- [ ] **Step 2: Commit**

```bash
git add src/theme.ts
git commit -m "feat: add central theme tokens"
```

---

### Task 3: Vitest scaffold + theme smoke test

**Files:**
- Create: `src/theme.test.ts`

**Interfaces:**
- Consumes: `theme` (default) and `isHexColor` from `src/theme.ts` (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import theme, { isHexColor } from './theme';

describe('theme', () => {
  it('validates hex colors correctly', () => {
    expect(isHexColor('#12121a')).toBe(true);
    expect(isHexColor('not-a-color')).toBe(false);
  });

  it('every color token is a valid hex color', () => {
    for (const [name, value] of Object.entries(theme.colors)) {
      expect(isHexColor(value), `colors.${name} = "${value}"`).toBe(true);
    }
    for (const [name, value] of Object.entries(theme.byType)) {
      expect(isHexColor(value), `byType.${name} = "${value}"`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test suite**

Run: `npm run test`
Expected: PASS, 2 tests.

- [ ] **Step 3: Commit**

```bash
git add src/theme.test.ts
git commit -m "test: cover theme token validity"
```

---

### Task 4: Supabase client and environment files

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `.env.example`

**Interfaces:**
- Produces: `supabase` (named export), a `SupabaseClient` instance. Task 9 consumes it.

- [ ] **Step 1: Write `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 2: Write `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas (.env.local).',
  );
}

export const supabase = createClient(url, anonKey);
```

- [ ] **Step 3: Fetch the real project URL and anon key and write `.env.local`**

Use the Supabase MCP tool for the `gbcpfsczjivtwkyheihu` project (look it up with `ToolSearch({query: "supabase project url anon key", max_results: 5})` if the name isn't already loaded — it is typically `get_project_url`/`get_anon_key` or similar). Write the values into a local, gitignored `.env.local`:

```
VITE_SUPABASE_URL=<valor real do projeto>
VITE_SUPABASE_ANON_KEY=<valor real do projeto>
```

`.env.local` is already covered by the `.gitignore` from Task 1 — confirm it does not appear in `git status`.

- [ ] **Step 4: Verify the client builds**

Run: `npm run build`
Expected: build succeeds (the `if (!url || !anonKey)` guard only throws at runtime, not at compile time).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts .env.example
git commit -m "feat: add Supabase client"
```

---

### Task 5: Catalog schema migration

**Files:**
- Create: `supabase/migrations/0001_catalog_schema.sql`

**Interfaces:**
- Produces: tables `parts`, `beyblades`, `beyblade_parts`; enums `part_slot`, `anatomy`, `product_line`, `brand`, `spin_direction`, `bey_type`, `rarity`, `release_type`, `resistance`; function `set_updated_at()`. Task 6 reuses `set_updated_at()`; Task 7 adds RLS to these three tables; Task 9 reads from `parts`.

- [ ] **Step 1: Write `supabase/migrations/0001_catalog_schema.sql`**

```sql
-- Onda 0 — catálogo (design §4.2, §4.3)

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

create table parts (
  id               uuid primary key default gen_random_uuid(),
  slot             part_slot    not null,
  brand            brand        not null default 'takara_tomy',
  name             text         not null,
  code             text,
  line             product_line not null,
  attack           smallint     not null default 0,
  defense          smallint     not null default 0,
  stamina          smallint     not null default 0,
  weight_g         numeric(5,2),
  height_mm        numeric(4,1),
  contact_points   smallint,
  burst_resistance resistance,
  dash_performance resistance,
  spin_direction   spin_direction,
  part_type        bey_type,
  equivalent_id    uuid references parts(id),
  image_path       text,
  source_url       text         not null,
  notes            text,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  unique (brand, slot, name),
  unique (id, slot),
  check (equivalent_id is null or equivalent_id <> id)
);

create table beyblades (
  id            uuid         primary key default gen_random_uuid(),
  release_code  text         not null,
  name          text         not null,
  line          product_line not null,
  anatomy       anatomy      not null,
  brand         brand        not null default 'takara_tomy',
  release_type  release_type not null,
  release_date  date,
  rarity        rarity       not null default 'common',
  bey_type      bey_type,
  equivalent_id uuid references beyblades(id),
  image_path    text,
  source_url    text         not null,
  notes         text,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  unique (brand, release_code, name),
  check (equivalent_id is null or equivalent_id <> id)
);

create table beyblade_parts (
  beyblade_id uuid      not null references beyblades(id) on delete cascade,
  part_id     uuid      not null,
  slot        part_slot not null,
  position    smallint  not null default 1,
  primary key (beyblade_id, slot, position),
  foreign key (part_id, slot) references parts(id, slot)
);

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on parts
  for each row execute function set_updated_at();
create trigger set_updated_at before update on beyblades
  for each row execute function set_updated_at();
```

- [ ] **Step 2: Apply the migration through the Supabase MCP server**

Use the MCP tool that applies a migration for project `gbcpfsczjivtwkyheihu` (discover the exact name with `ToolSearch({query: "supabase apply migration", max_results: 5})` if not already loaded), passing this file's name (`0001_catalog_schema`) and contents as the query.

- [ ] **Step 3: Verify against the live database**

Use the Supabase MCP SQL-execution tool to run:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected: `beyblade_parts`, `beyblades`, `parts` are present.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_catalog_schema.sql
git commit -m "feat(db): add catalog schema migration"
```

---

### Task 6: User-data schema migration

**Files:**
- Create: `supabase/migrations/0002_user_schema.sql`

**Interfaces:**
- Consumes: `set_updated_at()`, `beyblades`, `parts`, `part_slot`, `anatomy` (Task 5).
- Produces: tables `profiles`, `inventory_items`, `combos`, `combo_parts`; enum `inventory_status`; view `user_parts`; trigger `on_auth_user_created`. Task 7 adds RLS to these four tables; Task 9's later waves (not this plan) consume `user_parts`.

- [ ] **Step 1: Write `supabase/migrations/0002_user_schema.sql`**

```sql
-- Onda 0 — dados do usuário (design §4.4, §4.5, §4.6)

create type inventory_status as enum ('owned', 'wishlist');

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table inventory_items (
  id          uuid     primary key default gen_random_uuid(),
  profile_id  uuid     not null references profiles(id) on delete cascade,
  beyblade_id uuid     not null references beyblades(id),
  quantity    smallint not null default 1 check (quantity > 0),
  status      inventory_status not null default 'owned',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, beyblade_id),
  check (status = 'owned' or quantity = 1)
);

create table combos (
  id         uuid    primary key default gen_random_uuid(),
  profile_id uuid    not null references profiles(id) on delete cascade,
  name       text    not null,
  anatomy    anatomy not null,
  notes      text,
  share_slug text    unique,
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_public = (share_slug is not null))
);

create table combo_parts (
  combo_id uuid      not null references combos(id) on delete cascade,
  part_id  uuid      not null,
  slot     part_slot not null,
  position smallint  not null default 1,
  primary key (combo_id, slot, position),
  foreign key (part_id, slot) references parts(id, slot)
);

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on inventory_items
  for each row execute function set_updated_at();
create trigger set_updated_at before update on combos
  for each row execute function set_updated_at();

create view user_parts with (security_invoker = true) as
select i.profile_id, bp.part_id, bp.slot, sum(i.quantity)::int as quantity
from inventory_items i
join beyblade_parts bp on bp.beyblade_id = i.beyblade_id
where i.status = 'owned'
group by i.profile_id, bp.part_id, bp.slot;

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 2: Apply the migration through the Supabase MCP server**

Same tool as Task 5, Step 2, with name `0002_user_schema`.

- [ ] **Step 3: Verify against the live database**

Run via the SQL-execution MCP tool:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in
  ('profiles', 'inventory_items', 'combos', 'combo_parts', 'user_parts')
order by table_name;
```

Expected: all five names present (`user_parts` is a view, still listed in `information_schema.tables`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_user_schema.sql
git commit -m "feat(db): add user-data schema migration"
```

---

### Task 7: RLS policies migration

**Files:**
- Create: `supabase/migrations/0003_rls_policies.sql`

**Interfaces:**
- Consumes: all seven tables from Tasks 5 and 6.
- Produces: RLS enabled + policies on all seven tables; function `get_shared_combo(slug text)`.

- [ ] **Step 1: Write `supabase/migrations/0003_rls_policies.sql`**

```sql
-- Onda 0 — RLS (design §4.8)

alter table parts            enable row level security;
alter table beyblades        enable row level security;
alter table beyblade_parts   enable row level security;
alter table profiles         enable row level security;
alter table inventory_items  enable row level security;
alter table combos           enable row level security;
alter table combo_parts      enable row level security;

-- Catálogo: leitura pública, escrita apenas por service_role (nenhuma policy de escrita).
create policy "parts public read" on parts
  for select to anon, authenticated using (true);
create policy "beyblades public read" on beyblades
  for select to anon, authenticated using (true);
create policy "beyblade_parts public read" on beyblade_parts
  for select to anon, authenticated using (true);

-- Perfil: leitura e escrita restritas ao próprio; só display_name é editável.
create policy "profiles select own" on profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles update own" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated;
grant update (display_name) on profiles to authenticated;

-- Inventário: CRUD restrito ao próprio.
create policy "inventory_items select own" on inventory_items
  for select to authenticated using (profile_id = auth.uid());
create policy "inventory_items insert own" on inventory_items
  for insert to authenticated with check (profile_id = auth.uid());
create policy "inventory_items update own" on inventory_items
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "inventory_items delete own" on inventory_items
  for delete to authenticated using (profile_id = auth.uid());

-- Combos: CRUD restrito ao próprio. Sem policy de leitura pública (design §4.8) —
-- o acesso a um combo compartilhado passa pela função get_shared_combo abaixo.
create policy "combos select own" on combos
  for select to authenticated using (profile_id = auth.uid());
create policy "combos insert own" on combos
  for insert to authenticated with check (profile_id = auth.uid());
create policy "combos update own" on combos
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "combos delete own" on combos
  for delete to authenticated using (profile_id = auth.uid());

create policy "combo_parts select own" on combo_parts
  for select to authenticated using (
    exists (select 1 from combos c where c.id = combo_parts.combo_id and c.profile_id = auth.uid())
  );
create policy "combo_parts insert own" on combo_parts
  for insert to authenticated with check (
    exists (select 1 from combos c where c.id = combo_parts.combo_id and c.profile_id = auth.uid())
  );
create policy "combo_parts update own" on combo_parts
  for update to authenticated using (
    exists (select 1 from combos c where c.id = combo_parts.combo_id and c.profile_id = auth.uid())
  ) with check (
    exists (select 1 from combos c where c.id = combo_parts.combo_id and c.profile_id = auth.uid())
  );
create policy "combo_parts delete own" on combo_parts
  for delete to authenticated using (
    exists (select 1 from combos c where c.id = combo_parts.combo_id and c.profile_id = auth.uid())
  );

-- Combo compartilhado por link secreto (design §4.8): função em vez de policy pública,
-- para não permitir listar todos os combos públicos do site.
create function get_shared_combo(slug text)
returns table (
  combo_id             uuid,
  combo_name           text,
  anatomy              anatomy,
  notes                text,
  author_display_name  text,
  part_id              uuid,
  slot                 part_slot,
  position             smallint
)
language sql security definer set search_path = '' as $$
  select c.id, c.name, c.anatomy, c.notes, p.display_name,
         cp.part_id, cp.slot, cp.position
  from public.combos c
  join public.profiles p on p.id = c.profile_id
  join public.combo_parts cp on cp.combo_id = c.id
  where c.share_slug = slug and c.is_public;
$$;

grant execute on function get_shared_combo(text) to anon, authenticated;
```

- [ ] **Step 2: Apply the migration through the Supabase MCP server**

Same tool as before, name `0003_rls_policies`.

- [ ] **Step 3: Verify RLS is actually enforced**

Run via the SQL-execution MCP tool:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('parts','beyblades','beyblade_parts','profiles',
                   'inventory_items','combos','combo_parts')
order by relname;
```

Expected: `relrowsecurity = true` for all seven rows.

```sql
select tablename, policyname from pg_policies
where schemaname = 'public' order by tablename, policyname;
```

Expected: 3 policies on `parts`/`beyblades`/`beyblade_parts` combined (1 each), 2 on `profiles`, 4 each on `inventory_items`/`combos`/`combo_parts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_rls_policies.sql
git commit -m "feat(db): add RLS policies and get_shared_combo"
```

---

### Task 8: Storage bucket for bey images

**Files:**
- Create: `supabase/migrations/0004_storage.sql`

**Interfaces:**
- Produces: public-read `bey-images` bucket. Used later by the Wave 1 image-seeding script (`scripts/seed-images.ts`, out of scope for this plan).

- [ ] **Step 1: Write `supabase/migrations/0004_storage.sql`**

```sql
-- Onda 0 — Storage (design §4.9): bucket público para leitura, escrita só por service_role.

insert into storage.buckets (id, name, public)
values ('bey-images', 'bey-images', true)
on conflict (id) do nothing;

create policy "bey-images public read"
on storage.objects for select
to public
using (bucket_id = 'bey-images');
```

- [ ] **Step 2: Apply the migration through the Supabase MCP server**

Same tool as before, name `0004_storage`.

- [ ] **Step 3: Verify**

Run via the SQL-execution MCP tool:

```sql
select id, public from storage.buckets where id = 'bey-images';
```

Expected: one row, `public = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_storage.sql
git commit -m "feat(db): add bey-images storage bucket"
```

---

### Task 9: Connectivity smoke-test page

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 4), `theme` (Task 2).

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import theme from './theme';

type ConnectionState =
  | { status: 'loading' }
  | { status: 'ok'; partsCount: number }
  | { status: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<ConnectionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('parts')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ status: 'error', message: error.message });
        } else {
          setState({ status: 'ok', partsCount: count ?? 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.font.family,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
      }}
    >
      <h1 style={{ fontSize: theme.font.size.xl }}>Blade X Lab</h1>
      {state.status === 'loading' && <p>Conectando ao Supabase…</p>}
      {state.status === 'ok' && (
        <p style={{ color: theme.colors.success }}>
          Conectado. {state.partsCount} peça(s) no catálogo.
        </p>
      )}
      {state.status === 'error' && (
        <p style={{ color: theme.colors.error }}>Erro: {state.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run the dev server and check it manually**

Run: `npm run dev`
Expected: page loads, shows "Conectado. 0 peça(s) no catálogo." (the catalog is still empty — seeding is Wave 1).

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Supabase connectivity smoke test"
```

---

### Task 10: PWA setup

**Files:**
- Create: `scripts/gen-pwa-icons.mjs`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Modify: `package.json`

**Interfaces:**
- Produces: `public/icons/icon-180.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`; an installable manifest; a service worker caching the app shell and, once the catalog endpoints exist in Wave 1, the Supabase REST reads for `parts`/`beyblades`/`beyblade_parts` with stale-while-revalidate (design §3.2).

- [ ] **Step 1: Write `scripts/gen-pwa-icons.mjs`**

Generates flat placeholder icons (no image-editing dependency) in `theme.colors.primary`. Replace with real artwork before public launch.

```js
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PRIMARY = [0x7c, 0x5c, 0xff]; // theme.colors.primary = #7c5cff

function crc32(buf) {
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function solidPng(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array(size).fill(row));
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, solidPng(size, PRIMARY));
}
console.log('Generated placeholder PWA icons in public/icons/.');
```

- [ ] **Step 2: Run the generator**

Run: `node scripts/gen-pwa-icons.mjs`
Expected: `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png` created.

- [ ] **Step 3: Install `vite-plugin-pwa`**

Run: `npm install -D vite-plugin-pwa`

- [ ] **Step 4: Update `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Blade X Lab',
        short_name: 'Blade X Lab',
        description: 'Catálogo, inventário e laboratório de híbridos Beyblade X',
        theme_color: '#12121a',
        background_color: '#12121a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // Leitura do catálogo (design §3.2): funciona offline com o último dado visto.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/rest/v1/') &&
              /\/(parts|beyblades|beyblade_parts)(\?|$)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'catalog-api' },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 5: Add the apple touch icon link to `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="apple-touch-icon" href="/icons/icon-180.png" />
    <title>Blade X Lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Add the icon-regeneration script to `package.json`**

Add under `"scripts"`: `"gen:icons": "node scripts/gen-pwa-icons.mjs"`.

- [ ] **Step 7: Build and verify the manifest is emitted**

Run: `npm run build`
Expected: `dist/manifest.webmanifest` and `dist/sw.js` exist alongside `dist/icons/`.

- [ ] **Step 8: Commit**

```bash
git add scripts/gen-pwa-icons.mjs vite.config.ts index.html package.json package-lock.json public/icons
git commit -m "feat: add PWA manifest, service worker, and placeholder icons"
```

---

### Task 11: `SUPABASE_ADMIN.md`

**Files:**
- Create: `SUPABASE_ADMIN.md`

- [ ] **Step 1: Write `SUPABASE_ADMIN.md`**

```markdown
# Administração do Supabase — Blade X Lab

Projeto: `gbcpfsczjivtwkyheihu` (BLADEXLAB, us-east-1).

## Acesso

Schema e RLS são versionados em `supabase/migrations/` e aplicados via o servidor MCP
hospedado do Supabase, escopado a este projeto:

\`\`\`bash
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=gbcpfsczjivtwkyheihu"
\`\`\`

Não há CLI local do Supabase neste projeto — toda migration é escrita como arquivo em
`supabase/migrations/<NNNN>_<descricao>.sql` e aplicada pelo MCP.

## Manutenção do catálogo

Conforme decisão de design, o catálogo (`parts`, `beyblades`, `beyblade_parts`) é
somente-leitura pela API pública. Correções de dados entram por SQL direto no painel do
Supabase ou via MCP, nunca por uma tela de administração no app.

## Chaves

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (anon, seguras para o cliente) ficam em
`.env.local`, nunca commitadas. A chave `service_role` é usada apenas pelos scripts de seed
(`scripts/seed.ts`, `scripts/seed-images.ts`, onda 1) e nunca chega ao bundle do cliente.
```

- [ ] **Step 2: Commit**

```bash
git add SUPABASE_ADMIN.md
git commit -m "docs: add Supabase administration notes"
```

---

### Task 12: Deploy to Vercel

This task needs an interactive login the agent cannot perform — run Steps 1–3 yourself (André); an agent can run Steps 4 onward once the project is linked.

- [ ] **Step 1 (manual): Log in to Vercel**

```bash
npx vercel login
```

- [ ] **Step 2 (manual): Link the repo to a Vercel project**

```bash
npx vercel link
```

Accept defaults (framework: Vite, build command `npm run build`, output directory `dist`).

- [ ] **Step 3 (manual): Set the production environment variables**

```bash
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
```

Paste the same values written to `.env.local` in Task 4.

- [ ] **Step 4: Deploy**

Run: `npx vercel --prod`
Expected: command prints a production URL.

- [ ] **Step 5: Verify the live page**

Open the printed URL. Expected: same "Conectado. 0 peça(s) no catálogo." page as `npm run dev` showed in Task 9.

- [ ] **Step 6: Record the URL**

Add it to the top of `docs/superpowers/specs/2026-08-31-blade-x-lab-design.md` status line or tell André directly — no fixed file for this in the design; a one-line note is enough for now.

---

## Definition of done

- `npm run build` and `npm run test` both succeed locally.
- All four migrations are applied on project `gbcpfsczjivtwkyheihu` and the verification queries in Tasks 5–8 return the expected rows.
- The Vercel production URL loads and shows a successful Supabase connection.
- Every task above is committed individually (no squashing) so the history documents the foundation step by step.
