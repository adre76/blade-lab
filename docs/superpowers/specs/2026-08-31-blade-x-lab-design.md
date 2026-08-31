# Blade X Lab — Design

**Data:** 2026-08-31
**Status:** Aprovado pelo usuário, revisado, aguardando plano de implementação
**Projeto Supabase:** `gbcpfsczjivtwkyheihu` (BLADEXLAB, us-east-1)

---

## 1. Objetivo

Portal web (responsivo, instalável como PWA) sobre Beyblade X com três funções:

1. **Catálogo público** — todos os Beyblade X já lançados, com código, natureza, nome, raridade e a decomposição em peças. Acessível sem login.
2. **Inventário pessoal** — usuário autenticado registra o que possui (com duplicatas) e o que deseja.
3. **Laboratório** — montagem de híbridos com peças de beys diferentes, com análise das características resultantes em tempo real. **Também é público**: o visitante monta e analisa livremente; apenas *salvar* um combo exige conta.

O nome reflete a proposta: um laboratório de criação somado a um catálogo.

Uma segunda fase acrescenta o parecer de uma IA local (Ollama em um Mac Mini M4).

### 1.1 Escopo deste documento

Este design cobre as **ondas 0 a 4** em detalhe suficiente para planejar e implementar.

Duas entregas ficam **deliberadamente fora do escopo** e terão design próprio antes de começarem, porque especificá-las agora seria inventar decisões sem informação:

- **Onda 5 — simulação de batalha** (`battle.ts`). Depende de calibrar um modelo contra o comportamento real das peças, o que só é possível com o catálogo completo em mãos.
- **Onda 7 — IA local** (prompt, autenticação da Edge Function, timeout, comportamento com o Mac Mini offline).

A onda 6 (Hasbro) não tem design próprio, mas o schema **já a suporta** — ver §4.7. Isso é intencional: as constraints da marca nascem na migration inicial e não podem esperar.

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
| Anatomia | Modelo completo: BX, UX, CX e CX+Expand |
| Stats | Valores por peça + fórmula transparente e auditável |
| Raridade | Disponibilidade no mercado (derivada do tipo de lançamento) |
| Inventário | Beys com quantidade + wishlist. **Sem cadastro de peças avulsas** |
| Lab | Público. Montagem livre no catálogo inteiro, com alerta do que o usuário não possui |
| Combos | Privados por padrão, com link secreto opcional |
| Análise | Perfil + comparação + simulação de batalha **rotulada como especulativa** |
| Imagens | Baixadas e servidas pelo Supabase Storage |
| Idioma | Interface pt-BR, nomes de beys e peças no original. **Valores de banco em inglês** |
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
- **`react-router`** em vez do roteamento manual do `main.jsx`.

### 3.1 Rotas

| Rota | Acesso | Observação |
|---|---|---|
| `/` | Pública | Catálogo. Filtros e busca vivem na querystring, para link compartilhável |
| `/bey/:id` | Pública | Detalhe do bey de fábrica |
| `/peca/:id` | Pública | Detalhe da peça, com a lista de beys que a contêm |
| `/lab` | Pública | Laboratório. A montagem atual é serializada na querystring |
| `/inventario` | Autenticada | Possuídos e wishlist |
| `/combos` | Autenticada | Combos salvos |
| `/c/:slug` | Pública | Combo compartilhado por link secreto |
| `/privacidade` | Pública | |
| `/creditos` | Pública | Fontes dos dados e das imagens |

### 3.2 Comportamento offline (PWA)

O service worker faz cache do *app shell* e das respostas do catálogo com estratégia
*stale-while-revalidate*: aberto sem rede, o app mostra o catálogo já visitado e o
laboratório funciona por inteiro, já que o motor é local. Inventário e combos exigem rede
e exibem estado de indisponibilidade. Não há fila de escrita offline.

## 4. Modelo de dados

### 4.1 Linha de produto e anatomia são coisas diferentes

Em três anos a composição do Beyblade X mudou quatro vezes:

| Anatomia | Composição | Slots |
|---|---|---|
| `basic` (BX) | Blade + Ratchet + Bit | 3 |
| `unique` (UX) | Blade + Assist Blade + Ratchet + Bit | 4 |
| `custom` (CX) | Lock Chip + Main Blade + Assist Blade + Ratchet + Bit | 5 |
| `custom_expand` (CX, fev/2026) | Lock Chip + Metal Blade + Over Blade + Assist Blade + Ratchet + Bit | 6 |

**O Expand Blade não é uma linha de produto nova** — é uma composição estendida *dentro*
da linha CX. Por isso o modelo separa dois conceitos que a primeira versão deste design
confundia:

- **`product_line`** (`BX`, `UX`, `CX`) — a linha comercial da Takara Tomy.
- **`anatomy`** — o conjunto de slots que o bey ocupa.

Uma composição nova no futuro acrescenta um valor em `anatomy` e, se necessário, um em
`part_slot`. Nenhuma tabela muda de forma, nenhum dado migra, e o motor continua iterando
os slots presentes sem conhecê-los de antemão.

### 4.2 Enums

```sql
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
```

`metal_blade` e `main_blade` são slots distintos e **mutuamente exclusivos** no mesmo bey:
o Metal Blade da composição Expand é o sucessor funcional do Main Blade, mas tem geometria
e peso próprios, e tratá-los como o mesmo slot impediria filtrar o catálogo por
compatibilidade real.

Todos os valores de enum são em inglês, inclusive `rarity`. A decisão de interface em pt-BR
vale para os rótulos exibidos, não para os dados — misturar idiomas no banco convida a
confundir valor com legenda.

### 4.3 Catálogo

```sql
create table parts (
  id               uuid primary key default gen_random_uuid(),
  slot             part_slot    not null,
  brand            brand        not null default 'takara_tomy',
  name             text         not null,   -- "Dran Sword", "3-60", "Flat"
  code             text,                    -- notação curta quando existir: "F", "3-60"
  line             product_line not null,   -- linha em que a peça estreou
  attack           smallint     not null default 0,
  defense          smallint     not null default 0,
  stamina          smallint     not null default 0,
  weight_g         numeric(5,2),
  height_mm        numeric(4,1),            -- relevante para ratchets
  contact_points   smallint,                -- o "3" de "3-60"
  burst_resistance resistance,
  dash_performance resistance,              -- bits
  spin_direction   spin_direction,          -- lâminas
  part_type        bey_type,
  equivalent_id    uuid references parts(id),  -- peça Hasbro -> peça Takara Tomy
  image_path       text,
  source_url       text         not null,
  notes            text,
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  unique (brand, slot, name),
  unique (id, slot),                        -- alvo da FK composta (ver 4.6)
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
  equivalent_id uuid references beyblades(id),  -- bey Hasbro -> bey Takara Tomy
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
```

`beyblades` representa o bey **como veio de fábrica**. Um Random Booster contendo oito beys
produz oito linhas com o mesmo `release_code` — sem necessidade de uma tabela de produtos.

A FK composta `(part_id, slot)` é o que impede, no próprio banco, que um bey declare um bit
no slot de ratchet. Sem ela, a consistência dependeria apenas do teste de seed.

`rarity` é derivada de `release_type` no seed (`booster` → `common`; `random_booster` →
`rare`; `event_exclusive` → `exclusive`), mas fica gravada como coluna para permitir ajuste
manual quando a realidade do mercado divergir da regra.

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
```

`unique (profile_id, beyblade_id)` torna **possuído e desejado mutuamente exclusivos**:
marcar como adquirido um bey da wishlist é um `update` de `status`, não uma linha nova. O
`check` correspondente impede quantidade maior que um na wishlist, onde ela não teria
significado.

`combos.anatomy` é gravada explicitamente em vez de inferida do conjunto de slots. Inferir
seria ambíguo durante a montagem, quando o combo está parcialmente preenchido.

`check (is_public = (share_slug is not null))` elimina os dois estados incoerentes:
público sem link, e link em combo privado.

### 4.5 Criação do perfil

O perfil nasce no banco, por trigger, e não por escrita do cliente — assim não existe
janela em que um usuário autenticado não tenha perfil e o inventário falhe:

```sql
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

O `display_name` vem do Google, com o usuário podendo alterá-lo depois. O fallback pelo
e-mail cobre o caso de a conta Google não expor nome.

`updated_at` é mantido por trigger `before update` em todas as tabelas que o possuem, e não
por responsabilidade do cliente.

### 4.6 Estoque de peças derivado

O usuário registra beys, nunca peças soltas. O estoque de peças disponíveis para montagem
sai do inventário de beys — possuir duas cópias de "Dran Sword 3-60F" significa possuir
dois blades Dran Sword, dois ratchets 3-60 e dois bits F:

```sql
create view user_parts with (security_invoker = true) as
select i.profile_id, bp.part_id, bp.slot, sum(i.quantity)::int as quantity
from inventory_items i
join beyblade_parts bp on bp.beyblade_id = i.beyblade_id
where i.status = 'owned'
group by i.profile_id, bp.part_id, bp.slot;
```

`security_invoker = true` é obrigatório: sem ele a view roda com os privilégios do criador
e vaza o inventário de todos os usuários, ignorando o RLS da tabela base.

**Caminho inverso (peça ausente → wishlist).** Quando o laboratório detecta uma peça que o
usuário não possui, ele precisa oferecer *qual bey comprar*. A consulta é o inverso da view
acima — os beys que contêm aquela peça — apresentados ao usuário ordenados por raridade
crescente e data de lançamento decrescente, isto é, o mais fácil de achar primeiro. **O
usuário escolhe qual bey vai para a wishlist**; o app não decide por ele, porque o critério
real (preço, disponibilidade local, querer as outras peças do bey) não está no banco.

### 4.7 Suporte a Hasbro

A marca existe em `parts` e em `beyblades` desde a migration inicial, e não na onda 6,
porque `unique (brand, slot, name)` e as FKs compostas são constraints que não se
acrescentam depois sem migrar dados.

Regras:

- Peças e beys Hasbro são **registros próprios**, com os nomes que a Hasbro usa.
- `equivalent_id` aponta **sempre da Hasbro para a Takara Tomy**, nunca o contrário e nunca
  entre registros da mesma marca. O banco garante apenas a ausência de auto-referência; a
  direção é validada no teste de integridade do seed, que tem acesso à marca dos dois lados.
- O catálogo mostra **Takara Tomy por padrão**, com alternância para Hasbro. Isso evita
  exibir o mesmo bey duas vezes numa listagem que o usuário lê como "todos os beys".
- O laboratório opera sempre sobre peças Takara Tomy. Uma peça Hasbro selecionada é
  resolvida para sua equivalente antes da análise — os atributos são medidos na peça
  canonical.

### 4.8 RLS

| Tabela | Leitura | Escrita |
|---|---|---|
| `parts`, `beyblades`, `beyblade_parts` | Pública (`anon` + `authenticated`) | Nenhuma via API — apenas `service_role` (seed) e SQL no painel |
| `profiles` | Própria | Própria (apenas `display_name`) |
| `inventory_items` | Própria | Própria |
| `combos`, `combo_parts` | **Própria apenas** | Própria |

O catálogo é deliberadamente somente-leitura pela API. Não existe tela de administração;
correções entram por SQL, como decidido.

**Combo compartilhado.** Não existe policy de leitura pública em `combos`. Uma policy do
tipo "leitura se `is_public`" permitiria a qualquer visitante *listar todos* os combos
públicos do site, o que é bem mais amplo do que "link secreto opcional". O acesso se dá por
uma função que exige conhecer o slug:

```sql
create function get_shared_combo(slug text)
returns table (...) language sql security definer set search_path = '' as $$
  select ... from public.combos c
  join public.combo_parts cp on cp.combo_id = c.id
  where c.share_slug = slug and c.is_public
$$;
```

O slug tem 12 caracteres base32 gerados no banco (`gen_random_bytes`), espaço grande o
bastante para inviabilizar adivinhação. A função devolve também o `display_name` do autor —
é a única informação de perfil que sai para um visitante anônimo, e sai por escolha
explícita de quem compartilhou.

### 4.9 Storage

Bucket `bey-images`, **público para leitura**, escrita restrita a `service_role`. As
imagens são servidas pela CDN do Supabase; `parts.image_path` e `beyblades.image_path`
guardam o caminho relativo dentro do bucket, não a URL completa, para que trocar de host
não exija migração de dados.

## 5. Motor de análise

Módulo TypeScript puro em `src/lib/engine/`, sem dependência de React nem de rede. É o
coração do produto, e é o único **código de aplicação** com testes automatizados (os dados
de seed também são testados — ver §9).

| Arquivo | Responsabilidade | Onda |
|---|---|---|
| `types.ts` | Tipos de peça, combo e resultado de análise | 3 |
| `slots.ts` | Quais slots cada anatomia exige | 3 |
| `compatibility.ts` | Valida se um conjunto de peças forma um bey legal | 3 |
| `stats.ts` | Agrega atributos do combo | 3 |
| `archetype.ts` | Classifica o combo em um arquétipo legível | 3 |
| `explain.ts` | Contribuição de cada peça em cada atributo | 3 |
| `battle.ts` | Confronto especulativo entre dois combos | **5 — fora do escopo deste design** |

### 5.1 Slots por anatomia (`slots.ts`)

```
basic          : blade, ratchet, bit
unique         : blade, assist_blade, ratchet, bit
custom         : lock_chip, main_blade, assist_blade, ratchet, bit
custom_expand  : lock_chip, metal_blade, over_blade, assist_blade, ratchet, bit
```

Esta tabela é a única fonte de verdade sobre composição, consumida por
`compatibility.ts`, pela interface do laboratório e pelo teste de integridade do seed.

### 5.2 Compatibilidade (`compatibility.ts`)

Um combo é **válido** quando:

1. Todo slot exigido pela anatomia está preenchido, e nenhum slot fora dela está.
2. Cada peça tem `slot` igual ao slot que ocupa (garantido também pela FK composta).
3. Todas as peças são da marca canonical, após a resolução descrita em §4.7.

Um combo é **incompleto** quando faltam slots mas nenhuma regra é violada. Esse é o estado
normal durante a montagem: o laboratório **analisa combos incompletos**, exibindo os
atributos parciais acumulados e marcando explicitamente quais slots ainda faltam. Só um
combo válido pode ser salvo ou compartilhado.

`parts.line` registra **a linha em que a peça estreou**, e não restringe onde ela pode ser
usada — compatibilidade é determinada pelo slot, não pela linha. Um Ratchet lançado na BX
é legal em um combo `custom_expand`. Esta é a razão de `line` não participar de nenhuma
regra de validação.

### 5.3 Agregação (`stats.ts`)

```
attack   = soma de part.attack   sobre todos os slots preenchidos
defense  = soma de part.defense
stamina  = soma de part.stamina
weight_g = soma de part.weight_g   (nulo conta como 0 e marca o total como parcial)

burst_resistance = mínimo entre ratchet.burst_resistance e bit.burst_resistance
height_mm        = ratchet.height_mm
spin_direction   = primeiro presente entre: blade -> main_blade -> metal_blade
```

Regras que a primeira versão deste design deixava em aberto:

- **Ordinal de `resistance`:** `very_low`=1, `low`=2, `medium`=3, `high`=4, `very_high`=5.
- **Nulo em `burst_resistance`** significa desconhecido, não zero: o valor nulo é ignorado
  no mínimo. Se ambos forem nulos, o resultado é `desconhecido` e a interface o diz, em vez
  de exibir um número inventado.
- **Lock Chip não participa** do cálculo de burst. A retenção depende do encaixe entre
  ratchet e bit; o Lock Chip prende as lâminas entre si.
- **`spin_direction` igual a `dual`** é propagado como `dual`; o tratamento em confronto
  pertence ao design da onda 5.

### 5.4 Normalização das barras

Cada atributo é exibido em 0–100. O denominador é o **máximo teórico da anatomia do combo**:
para cada slot da anatomia, o maior valor daquele atributo entre todas as peças do catálogo
que ocupam aquele slot, somados.

Escolhi o máximo teórico e não o máximo entre os beys de fábrica porque o produto é sobre
híbridos: uma barra que estoura os 100% quando o usuário monta algo melhor que qualquer bey
de fábrica seria um bug visível. O denominador é recalculado quando o catálogo carrega, de
modo que a escala continua correta conforme peças novas entram.

### 5.5 Arquétipo (`archetype.ts`)

A classificação usa os três atributos já normalizados (§5.4):

- **Dominante** — o maior dos três. Se ele exceder o segundo em pelo menos 15 pontos, o
  arquétipo é puro: `Ataque`, `Defesa` ou `Stamina`.
- Caso contrário, o arquétipo é `Equilibrado`, qualificado pelos dois maiores
  (ex.: `Equilibrado — Ataque/Stamina`).
- **Qualificadores**, acrescentados quando aplicáveis: `frágil` se `burst_resistance` ≤ 2;
  `resistente` se ≥ 4; `pesado` se o peso estiver no quartil superior do catálogo; `leve`
  se estiver no inferior.

Empate exato entre atributos é resolvido na ordem fixa Ataque > Defesa > Stamina, para que
a classificação seja determinística e testável.

### 5.6 Transparência (`explain.ts`)

A interface nunca mostra um número sem origem. Ao lado da barra de Ataque em 88, o usuário
vê que 60 vieram do blade, 13 do ratchet e 15 do bit. Além de ser mais útil, isso preserva
o valor do parecer da IA na fase 2: ela complementa a análise em vez de competir com uma
caixa-preta.

### 5.7 Simulação de batalha — fora do escopo

`battle.ts` estimará probabilidade de vitória por burst finish, ringout e spin finish. **A
fórmula não está definida neste documento e não deve ser inventada durante a
implementação**: ela exige calibração contra o comportamento real das peças, o que só é
possível com o catálogo completo. A onda 5 recebe design próprio.

Quando existir, a interface exibirá aviso explícito e permanente de que é um modelo teórico
não validado em torneio, conforme determinado pelo usuário. Nenhum resultado real de
competição alimenta o cálculo.

## 6. Pipeline de dados

Uma única passada resolve dados e imagens, já que a fonte é a mesma:

1. Pesquisa e curadoria em fontes públicas (Beyblade Wiki, beybxdb.com, byybladebuilder.com,
   WorldBeyblade.org). Cada peça e cada bey guardam seu `source_url`.
2. Os dados viram arquivos JSON versionados em `data/`, um arquivo por slot de peça e um por
   linha de produto, mantendo os diffs legíveis. Cada arquivo é validado contra um schema
   Zod antes de qualquer escrita.
3. `npm run seed` valida e envia ao Supabase usando a chave `service_role`. É
   **idempotente**: reexecutar não duplica nem apaga, faz upsert por chave natural
   (`brand + slot + name` para peças, `brand + release_code + name` para beys).
4. `npm run seed:images` baixa as artes, otimiza e envia ao bucket `bey-images`, também de
   forma idempotente.
5. `npm run types` regenera `src/types/database.ts` a partir do schema.
6. Manutenção posterior por SQL no painel, documentada em `SUPABASE_ADMIN.md`.

Volume estimado: cerca de 86 blades, 35 ratchets, 52 bits, mais as peças CX, e cerca de
150 beys.

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

| Onda | Entrega | Design |
|---|---|---|
| **0 — Fundação** | Repo, Vite + React + TS, projeto Supabase, schema e RLS, `theme.ts`, PWA, deploy | Este documento |
| **1 — Catálogo** | Coleta, seed e imagens; lista, busca, filtros, detalhe de bey e de peça. Sem login | Este documento |
| **2 — Conta** | Google OAuth, perfil, inventário com quantidade e wishlist | Este documento |
| **3 — Laboratório** | Motor com testes; montagem com análise em tempo real; alerta de peça ausente com atalho para a wishlist | Este documento |
| **4 — Combos** | Salvar, listar e compartilhar por link secreto | Este documento |
| **5 — Confronto** | Comparação lado a lado e simulação especulativa | **Design próprio antes de iniciar** |
| **6 — Hasbro** | Curadoria dos dados Hasbro e alternância de marca no catálogo | Schema pronto (§4.7) |
| **7 — IA local** | Edge Function, Cloudflare Tunnel, Ollama e parecer da IA no laboratório | **Design próprio antes de iniciar** |

As ondas 1 a 3 cobrem o que o usuário classificou como imprescindível. Recomenda-se
publicar cada onda assim que pronta, mas **anunciar publicamente ao fim da onda 3** — isso
permite validar os dados do catálogo com uso real antes de construir o laboratório sobre
eles.

A curadoria Hasbro fica na onda 6, e não na 1, porque mapear equivalências sem a base
Takara Tomy completa e revisada duplicaria o retrabalho. O *schema* que a suporta, porém,
nasce na onda 0.

**Cada onda recebe seu próprio plano de implementação.** Este documento é o design; não
deve virar um plano único.

## 9. Testes

Vitest, cobrindo:

- **`stats.ts`** — agregação dos três atributos, regra do mínimo no burst, tratamento de
  nulo como desconhecido, exclusão do Lock Chip, precedência de `spin_direction`,
  normalização contra o máximo teórico.
- **`compatibility.ts`** — combo válido, incompleto e inválido nas quatro anatomias; peça
  em slot errado; slot fora da anatomia; peça de linha diferente sendo aceita.
- **`archetype.ts`** — arquétipo puro, equilibrado, cada qualificador, e o desempate
  determinístico.
- **`explain.ts`** — a soma das contribuições reproduz o total agregado.
- **Integridade do seed** — todo bey com o conjunto de slots exato de sua anatomia; ausência
  de duplicatas por chave natural; atributos dentro da faixa; toda peça referenciada
  existindo; `source_url` presente em todo registro; `equivalent_id` sempre apontando de
  `hasbro` para `takara_tomy`.

A interface segue sem testes automatizados, como no Trocação.

## 10. Riscos e questões em aberto

| Risco | Tratamento |
|---|---|
| Os atributos por peça vêm em boa parte de **medições da comunidade**, não de folha oficial da Takara Tomy | `source_url` obrigatório por registro e página `/creditos` com as fontes |
| As **imagens são arte oficial** Takara Tomy/Hasbro, usadas por fã | Decisão consciente do usuário; risco assumido por ele. Créditos visíveis e remoção mediante pedido |
| A **curadoria de ~170 peças e ~150 beys é trabalho manual** e é o item mais demorado do projeto | Isolada na onda 1; validação Zod e testes de integridade pegam erro de digitação |
| A **simulação de batalha é especulativa** | Fora do escopo deste design; aviso explícito e permanente quando existir |
| O acesso do MCP ao Supabase é de **escrita** (migrations exigem) | Escopado com `project_ref` ao projeto `gbcpfsczjivtwkyheihu`, isolado do Trocação |
| Lançamentos novos mudam a composição | `anatomy` e `part_slot` absorvem sem migração; foi o motivo da escolha |
| O laboratório é público e o motor roda no cliente | Aceito: o catálogo já é público e o cálculo não contém segredo comercial |
