# Blade X Lab — Design

**Data:** 2026-08-31
**Status:** Aprovado pelo usuário, aguardando plano de implementação

---

## 1. Objetivo

Portal web (responsivo, instalável como PWA) sobre Beyblade X com três funções:

1. **Catálogo público** — todos os Beyblade X já lançados, com código, natureza, nome, raridade e a decomposição em peças. Acessível sem login.
2. **Inventário pessoal** — usuário autenticado registra o que possui (com duplicatas) e o que deseja.
3. **Laboratório** — montagem de híbridos com peças de beys diferentes, com análise das características resultantes em tempo real.

O nome reflete a proposta: um laboratório de criação somado a um catálogo.

Uma segunda fase acrescenta o parecer de uma IA local (Ollama em um Mac Mini M4).

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Referência de estilo | `github.com/adre76/album-copa` (Trocação) |
| Stack | React 19 + Vite, **TypeScript**, Supabase, Vercel |
| Backend | Nenhum — frontend fala direto com o Supabase via RLS |
| Login | **Somente Google OAuth** (sem e-mail/senha, sem modo anônimo) |
| Mobile | Web responsivo + PWA instalável (sem app nativo) |
| Origem dos dados | Pesquisa e curadoria minha em fontes públicas, com seed versionado |
| Manutenção do catálogo | SQL direto no painel Supabase, documentado em `SUPABASE_ADMIN.md` |
| Abrangência | Takara Tomy (canonical) + Hasbro (camada de equivalência, onda 6) |
| Anatomia | Modelo completo: BX, UX, CX e Expand Blade |
| Stats | Valores por peça + fórmula transparente e auditável |
| Raridade | Disponibilidade no mercado (derivada do tipo de lançamento) |
| Inventário | Beys com quantidade + wishlist. **Sem cadastro de peças avulsas** |
| Lab | Montagem livre no catálogo inteiro, com alerta do que o usuário não possui |
| Combos | Privados por padrão, com link público opcional |
| Análise | Perfil + comparação + simulação de batalha **rotulada como especulativa** |
| Imagens | Baixadas e servidas pelo Supabase Storage |
| Idioma | Interface pt-BR, nomes de beys e peças no original |
| Testes | Vitest no motor de cálculo e na integridade do seed. UI sem testes |
| Acesso ao banco | MCP hospedado do Supabase, escopado com `project_ref` |

## 3. Arquitetura

```
Navegador (React + TS, PWA)  ->  Vercel (CDN)
      | supabase-js + RLS
Supabase (Postgres + Google OAuth + Storage)
      ^ script de seed (service_role, executado localmente)
                                    ... fase 2 ...
Edge Function (proxy)  ->  Cloudflare Tunnel  ->  Ollama no Mac Mini M4
```

Herda do Trocação: ausência de backend próprio, `theme.ts` central com estilos inline, hooks por domínio, um componente por tela, textos em pt-BR, manual SQL de administração.

Dois desvios deliberados, justificados pela escala maior deste app:

- **TypeScript** em vez de JS puro. O schema de slots variáveis e o motor de cálculo são exatamente onde tipos evitam erro silencioso.
- **`react-router`** em vez do roteamento manual do `main.jsx`. O Trocação tem 3 rotas; aqui são cerca de 8, e queremos estado de filtro na URL para links compartilháveis.

## 4. Modelo de dados

### 4.1 O problema que o schema resolve

Em três anos a anatomia do Beyblade X mudou quatro vezes:

| Linha | Composição | Slots |
|---|---|---|
| BX (Basic) | Blade + Ratchet + Bit | 3 |
| UX (Unique) | Blade + Assist Blade + Ratchet + Bit | 4 |
| CX (Custom) | Lock Chip + Main Blade + Assist Blade + Ratchet + Bit | 5 |
| Expand (fev/2026) | Lock Chip + Metal Blade + Over Blade + Assist Blade + Ratchet + Bit | 6 |

Qualquer schema com colunas fixas por tipo de peça quebra no próximo lançamento. A solução é uma tabela única de peças, onde cada peça declara seu slot, e uma tabela de ligação que monta o bey. Uma linha nova passa a ser um valor novo no enum, sem migração de dados e sem alteração no motor de análise, que itera slots sem saber quais existem.

### 4.2 Enums

```sql
create type part_slot as enum (
  'lock_chip', 'main_blade', 'over_blade', 'assist_blade',
  'blade', 'ratchet', 'bit'
);
create type product_line     as enum ('BX', 'UX', 'CX');
create type brand            as enum ('takara_tomy', 'hasbro');
create type spin_direction   as enum ('right', 'left', 'dual');
create type bey_type         as enum ('attack', 'defense', 'stamina', 'balance');
create type rarity           as enum ('comum','incomum','raro','muito_raro','exclusivo');
create type release_type     as enum ('starter','booster','random_booster','deck_set',
                                      'custom_set','limited','event_exclusive','other');
create type resistance       as enum ('very_low','low','medium','high','very_high');
create type inventory_status as enum ('owned', 'wishlist');
```

### 4.3 Catálogo

```sql
create table parts (
  id               uuid primary key default gen_random_uuid(),
  slot             part_slot    not null,
  name             text         not null,   -- "Dran Sword", "3-60", "Flat"
  code             text,                    -- notação curta quando existir: "F", "3-60"
  line             product_line not null,
  attack           smallint     not null default 0,
  defense          smallint     not null default 0,
  stamina          smallint     not null default 0,
  weight_g         numeric(5,2),
  height_mm        numeric(4,1),            -- relevante para ratchets
  contact_points   smallint,                -- o "3" de "3-60"
  burst_resistance resistance,
  dash_performance resistance,              -- bits
  spin_direction   spin_direction,          -- blades
  part_type        bey_type,
  image_path       text,
  source_url       text         not null,
  notes            text,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  unique (slot, name)
);

create table beyblades (
  id            uuid         primary key default gen_random_uuid(),
  release_code  text         not null,      -- "BX-34", "UX-07", "CX-05"
  name          text         not null,      -- "Dran Sword 3-60F"
  line          product_line not null,
  brand         brand        not null default 'takara_tomy',
  release_type  release_type not null,
  release_date  date,
  rarity        rarity       not null default 'comum',
  bey_type      bey_type,
  equivalent_id uuid references beyblades(id),  -- liga versão Hasbro à Takara Tomy
  image_path    text,
  source_url    text         not null,
  notes         text,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  unique (brand, release_code, name)
);

create table beyblade_parts (
  beyblade_id uuid      not null references beyblades(id) on delete cascade,
  part_id     uuid      not null references parts(id),
  slot        part_slot not null,
  position    smallint  not null default 1,
  primary key (beyblade_id, slot, position)
);
```

`beyblades` representa o bey **como veio de fábrica**. Um Random Booster contendo oito beys produz oito linhas com o mesmo `release_code` — sem necessidade de uma tabela de produtos.

`rarity` é derivada de `release_type` no seed (booster comum → `comum`; random booster → `raro`; exclusivo de evento → `exclusivo`), mas fica gravada como coluna para permitir ajuste manual quando a realidade do mercado divergir da regra.

### 4.4 Dados do usuário

```sql
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
  unique (profile_id, beyblade_id, status)
);

create table combos (
  id         uuid    primary key default gen_random_uuid(),
  profile_id uuid    not null references profiles(id) on delete cascade,
  name       text    not null,
  notes      text,
  share_slug text    unique,
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table combo_parts (
  combo_id uuid      not null references combos(id) on delete cascade,
  part_id  uuid      not null references parts(id),
  slot     part_slot not null,
  position smallint  not null default 1,
  primary key (combo_id, slot, position)
);
```

### 4.5 Estoque de peças derivado

O usuário registra beys, nunca peças soltas. O estoque de peças disponíveis para montagem sai do inventário de beys — possuir duas cópias de "Dran Sword 3-60F" significa possuir dois blades Dran Sword, dois ratchets 3-60 e dois bits F:

```sql
create view user_parts with (security_invoker = true) as
select i.profile_id, bp.part_id, bp.slot, sum(i.quantity)::int as quantity
from inventory_items i
join beyblade_parts bp on bp.beyblade_id = i.beyblade_id
where i.status = 'owned'
group by i.profile_id, bp.part_id, bp.slot;
```

`security_invoker = true` é obrigatório: sem ele a view roda com os privilégios do criador e vaza o inventário de todos os usuários, ignorando o RLS da tabela base.

### 4.6 RLS

| Tabela | Leitura | Escrita |
|---|---|---|
| `parts`, `beyblades`, `beyblade_parts` | Pública (`anon` + `authenticated`) | Nenhuma via API — apenas `service_role` (seed) e SQL no painel |
| `profiles` | Própria | Própria |
| `inventory_items` | Própria | Própria |
| `combos` | Própria **ou** `is_public = true` | Própria |
| `combo_parts` | Segue a visibilidade do combo pai | Própria |

O catálogo é deliberadamente somente-leitura pela API. Não existe tela de administração; correções entram por SQL, como decidido.

## 5. Motor de análise

Módulo TypeScript puro em `src/lib/engine/`, sem dependência de React nem de rede. É o coração do produto e o único código com testes automatizados.

| Arquivo | Responsabilidade |
|---|---|
| `types.ts` | Tipos de peça, combo e resultado de análise |
| `slots.ts` | Quais slots cada linha exige (BX 3, UX 4, CX 5, Expand 6) |
| `compatibility.ts` | Valida se um conjunto de peças forma um bey legal |
| `stats.ts` | Agrega atributos do combo |
| `archetype.ts` | Classifica o combo em um arquétipo legível |
| `explain.ts` | Contribuição de cada peça em cada atributo |
| `battle.ts` | Confronto especulativo entre dois combos |

### 5.1 Agregação

```
attack           = soma de part.attack
defense          = soma de part.defense
stamina          = soma de part.stamina
weight_g         = soma de part.weight_g
burst_resistance = min(ratchet.burst_resistance, bit.burst_resistance)
height_mm        = ratchet.height_mm
spin_direction   = blade.spin_direction     (ou main_blade, nas linhas CX)
```

`burst_resistance` usa o mínimo, não a soma: a resistência real é a do elo mais fraco.

Para as barras da interface, cada atributo é normalizado em 0–100 contra o máximo observado no catálogo, calculado uma vez no carregamento — assim a escala continua honesta quando peças novas entrarem.

### 5.2 Transparência

A interface nunca mostra um número sem origem. Ao lado da barra de Ataque em 88, o usuário vê que 60 vieram do blade, 13 do ratchet e 15 do bit. Além de ser mais útil, isso preserva o valor do parecer da IA na fase 2: ela complementa a análise em vez de competir com uma caixa-preta.

### 5.3 Simulação de batalha

`battle.ts` estima probabilidade de vitória por burst finish, ringout e spin finish a partir dos atributos relativos dos dois combos. **A interface exibe aviso explícito de que é um modelo teórico não validado em torneio**, conforme determinado pelo usuário. Nenhum resultado real de competição alimenta o cálculo.

## 6. Pipeline de dados

Uma única passada resolve dados e imagens, já que a fonte é a mesma:

1. Pesquisa e curadoria em fontes públicas (Beyblade Wiki, beybxdb.com, byybladebuilder.com, WorldBeyblade.org). Cada peça e cada bey guardam seu `source_url`.
2. Os dados viram arquivos versionados em `data/`, revisáveis por diff no Git.
3. `npm run seed` valida e envia ao Supabase usando a chave `service_role`.
4. `npm run seed:images` baixa as artes, otimiza e envia ao Supabase Storage.
5. Manutenção posterior por SQL no painel, documentada em `SUPABASE_ADMIN.md`.

Volume estimado: cerca de 86 blades, 35 ratchets, 52 bits, mais as peças CX, e cerca de 150 beys.

## 7. Estrutura do projeto

```
data/                        # seed versionado (JSON revisável por diff)
scripts/
  seed.ts                    # importa data/ para o Supabase
  seed-images.ts             # baixa artes e envia ao Storage
supabase/
  migrations/                # schema versionado
src/
  main.tsx
  App.tsx
  theme.ts                   # paleta central, estilos inline
  lib/
    supabase.ts
    engine/                  # motor de análise + testes
  hooks/
    useAuth.ts
    useCatalog.ts
    useInventory.ts
    useCombos.ts
  components/                # uma tela por arquivo
  types/database.ts          # tipos gerados do schema
docs/
SUPABASE_ADMIN.md
```

## 8. Ondas de implantação

Cada onda termina publicada e funcionando na Vercel.

| Onda | Entrega |
|---|---|
| **0 — Fundação** | Repo, Vite + React + TS, projeto Supabase, schema e RLS, `theme.ts`, PWA, deploy |
| **1 — Catálogo** | Coleta, seed e imagens; lista, busca, filtros, detalhe de bey e de peça. Sem login |
| **2 — Conta** | Google OAuth, perfil, inventário com quantidade e wishlist |
| **3 — Laboratório** | Motor com testes; montagem com análise em tempo real; alerta de peça ausente com atalho para a wishlist |
| **4 — Combos** | Salvar, listar e compartilhar por link público |
| **5 — Confronto** | Comparação lado a lado e simulação especulativa |
| **6 — Hasbro** | Camada de equivalência Takara Tomy ↔ Hasbro |
| **7 — IA local** | Edge Function, Cloudflare Tunnel, Ollama e parecer da IA no laboratório |

As ondas 1 a 3 cobrem o que o usuário classificou como imprescindível. Recomenda-se publicar cada onda assim que pronta, mas **anunciar publicamente ao fim da onda 3** — isso permite validar os dados do catálogo com uso real antes de construir o laboratório sobre eles.

Hasbro fica na onda 6, e não na 1, porque mapear equivalências sem a base Takara Tomy completa e revisada duplicaria o retrabalho.

## 9. Testes

Vitest, cobrindo:

- **Motor** — agregação de atributos, regra do mínimo no burst, normalização das barras, validação de compatibilidade em todas as quatro anatomias, contribuição por peça.
- **Integridade do seed** — todo bey com conjunto de slots válido para sua linha, ausência de códigos duplicados, atributos dentro da faixa, toda peça referenciada existindo, `source_url` presente.

A interface segue sem testes automatizados, como no Trocação.

## 10. Riscos e questões em aberto

| Risco | Tratamento |
|---|---|
| Os atributos por peça vêm em boa parte de **medições da comunidade**, não de folha oficial da Takara Tomy | `source_url` obrigatório por registro e crédito visível na interface |
| As **imagens são arte oficial** Takara Tomy/Hasbro, usadas por fã | Decisão consciente do usuário; risco assumido por ele. Página de créditos e remoção mediante pedido |
| A **curadoria de ~170 peças e ~150 beys é trabalho manual** e é o item mais demorado do projeto | Isolada na onda 1; testes de integridade pegam erro de digitação |
| A **simulação de batalha é especulativa** | Aviso explícito e permanente na interface |
| O acesso do MCP ao Supabase é de **escrita** (migrations exigem) | Escopado com `project_ref` a um projeto novo e dedicado, isolado do Trocação |
| Lançamentos novos mudam a anatomia | Schema de slots absorve sem migração; foi o motivo da escolha |
