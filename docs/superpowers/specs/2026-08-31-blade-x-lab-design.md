# Blade X Lab — Design

**Data:** 2026-08-31
**Status:** Aprovado pelo usuário, revisado em quatro rodadas, aguardando plano de implementação
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

A onda 6 (Hasbro) não tem design próprio, mas o schema e o caminho de dados **já a suportam** — ver §4.8. Isso é intencional: as constraints de marca e a resolução de equivalência nascem na onda 0 e não se acrescentam depois sem migrar dados.

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

### 3.1 Camadas

Sem backend, a fronteira entre "dados" e "cálculo" precisa ser explícita:

| Camada | Responsabilidade | Conhece rede? |
|---|---|---|
| `lib/supabase.ts` + `hooks/` | Busca dados, **resolve equivalências Hasbro → canonical** (§4.8), monta objetos de domínio | Sim |
| `lib/engine/` | Recebe peças já resolvidas e canonical; calcula | **Não** |
| `components/` | Exibe; calcula o **contexto de normalização** e normaliza para 0–100 (§5.4) | Não |

O motor nunca vê uma peça Hasbro nem um `part_id` não resolvido. Essa é a razão de a resolução morar na camada de dados: mantém o motor puro, testável com objetos literais e independente do catálogo.

O fluxo **não é de mão única**. `stats.ts` e `explain.ts` produzem valores brutos, que a
apresentação normaliza; mas `archetype.ts` (§5.5) classifica sobre valores já normalizados
e sobre quartis derivados do catálogo inteiro. O **contexto de normalização** — o
denominador por atributo de §5.4 mais os quartis de peso de §5.5 — é produzido por
`normalization.ts`, uma função pura do motor que recebe o catálogo como argumento. A
apresentação a chama uma vez, guarda o resultado e o repassa a `archetype.ts`.

Manter esse cálculo dentro do motor, e não nos componentes, é deliberado: é aritmética de
verdade, e a interface é a única camada sem testes (§2). O motor continua cego a rede — ele
recebe o catálogo, não vai buscá-lo.

### 3.2 Rotas

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

### 3.3 Comportamento offline (PWA)

O service worker faz cache do *app shell* e das respostas do catálogo com estratégia
*stale-while-revalidate*.

O laboratório offline exige **o catálogo inteiro em cache**, e não apenas as páginas
visitadas. O motivo está em §5.4: o denominador das barras é derivado de todo o catálogo,
e um catálogo parcial produziria barras que mudam de valor entre sessões para o mesmo
combo. Por isso a onda 1 faz *prefetch* do catálogo completo — é um volume pequeno
(~170 peças, ~150 beys sem imagens) e cabe folgadamente em cache.

Inventário e combos exigem rede e exibem estado de indisponibilidade. Não há fila de
escrita offline.

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
da linha CX. Por isso o modelo separa dois conceitos:

- **`product_line`** (`BX`, `UX`, `CX`) — a linha comercial da Takara Tomy.
- **`anatomy`** — o conjunto de slots que o bey ocupa.

Uma composição nova no futuro acrescenta um valor em `anatomy`, um em `part_slot` se
necessário, e linhas em `anatomy_slots` (§4.3). Nenhuma tabela muda de forma, nenhum dado
migra, e o motor continua iterando os slots presentes sem conhecê-los de antemão.

**Cada slot recebe exatamente uma peça.** Nenhuma anatomia conhecida tem multiplicidade, e
permiti-la exigiria regras de agregação que não existiriam para nada. As chaves primárias
refletem isso: `(bey, slot)`, sem coluna de posição.

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
vale para os rótulos exibidos, não para os dados.

**A ordem de declaração de `rarity` e `resistance` é significativa** — ambos são ordenados
por comparação de enum (§4.9 ordena por raridade crescente; §5.3 tira o mínimo de
`resistance`). Inserir um valor no meio do enum muda essas ordenações silenciosamente;
valores novos vão nas extremidades, ou a alteração é acompanhada de revisão das duas
seções.

### 4.3 Tabela de referência das anatomias

A composição de cada anatomia vive no banco, e não apenas no código:

```sql
create table anatomy_slots (
  anatomy anatomy   not null,
  slot    part_slot not null,
  primary key (anatomy, slot)
);
```

É a fonte de verdade usada pela validação de combos salvos (§4.6) e pelo teste de
integridade do seed. `src/lib/engine/slots.ts` (§5.1) é gerado do mesmo arquivo de dados
que popula esta tabela.

Para que "não podem divergir" seja verdade e não intenção, esta é a **única tabela
sincronizada de forma destrutiva** pelo seed: linhas presentes no banco e ausentes de
`data/anatomies.json` são apagadas (§6). O upsert idempotente usado no resto do catálogo
deixaria viva uma linha obsoleta — e obsoleta justamente na tabela que o trigger de
validade consulta, o que faria o banco aceitar combos com um slot que a anatomia não tem
mais. É uma tabela de referência minúscula e sem dados de usuário, então apagar é seguro.

**Cuidado operacional:** os triggers de §4.6 validam apenas em escrita, nunca em repouso.
Remover um slot de uma anatomia deixa os combos já salvos daquela anatomia inválidos e
silenciosamente **imutáveis** — não podem mais ser sequer renomeados, porque `update_combo`
revalida o conjunto inteiro. `SUPABASE_ADMIN.md` registra isso junto ao procedimento de
aposentadoria de peça: alterar uma anatomia já em uso exige migrar os combos afetados na
mesma transação.

### 4.4 Catálogo

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
  height_mm        numeric(4,1),            -- apenas ratchets
  contact_points   smallint,                -- o "3" de "3-60" — exibição apenas
  burst_resistance resistance,
  dash_performance resistance,              -- bits — exibição apenas
  spin_direction   spin_direction,          -- apenas lâmina principal (ver abaixo)
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

create table beyblade_parts (
  beyblade_id uuid      not null references beyblades(id) on delete cascade,
  part_id     uuid      not null,
  slot        part_slot not null,
  primary key (beyblade_id, slot),
  foreign key (part_id, slot) references parts(id, slot) on delete restrict
);
```

`beyblades` representa o bey **como veio de fábrica**. Um Random Booster contendo oito beys
produz oito linhas com o mesmo `release_code`.

A FK composta `(part_id, slot)` impede, no próprio banco, que um bey declare um bit no slot
de ratchet. `on delete restrict` em todo o catálogo é deliberado: como a manutenção é por
SQL direto no painel (§2), apagar uma peça referenciada deve falhar de forma barulhenta em
vez de destruir combos de usuários. `SUPABASE_ADMIN.md` documenta o procedimento de fusão
ou aposentadoria de uma peça.

**`spin_direction` é preenchida somente na lâmina principal** — o slot `blade`,
`main_blade` ou `metal_blade`. Em `over_blade`, `assist_blade`, `lock_chip`, `ratchet` e
`bit` a coluna é nula, e o teste de integridade do seed exige isso. Sem essa regra seria
possível cadastrar um `metal_blade` destro com um `over_blade` canhoto — combinação
fisicamente impossível que passaria por válida.

`contact_points` e `dash_performance` são coletados e exibidos no detalhe da peça, mas
**não entram em nenhum cálculo** nas ondas 0–4. Estão marcados como exibição apenas para
que ninguém procure a regra que os consome.

`rarity` é derivada de `release_type` no seed (`booster` → `common`; `random_booster` →
`rare`; `event_exclusive` → `exclusive`), mas fica gravada como coluna para permitir ajuste
manual quando a realidade do mercado divergir da regra.

`parts.line` para peças Hasbro recebe a linha da peça Takara Tomy equivalente. A Hasbro não
usa a nomenclatura BX/UX/CX, e inventar valores só para ela quebraria os filtros.

### 4.5 Dados do usuário

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
  beyblade_id uuid     not null references beyblades(id) on delete restrict,
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

create table combo_shares (
  combo_id   uuid    primary key references combos(id) on delete cascade,
  slug       text    not null unique default gen_share_slug(),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
```

`unique (profile_id, beyblade_id)` torna **possuído e desejado mutuamente exclusivos**:
marcar como adquirido um bey da wishlist é um `update` de `status`, não uma linha nova. O
`check` correspondente impede quantidade maior que um na wishlist, onde ela não teria
significado.

`combos.anatomy` é gravada explicitamente em vez de inferida do conjunto de slots. Inferir
seria ambíguo durante a montagem, quando o combo está parcialmente preenchido.

**O compartilhamento mora em `combo_shares`, e não em colunas de `combos`.** A razão é de
segurança: o usuário tem escrita própria em `combos`, e uma coluna `share_slug` ali seria
gravável pelo cliente — nada impediria alguém de definir `slug = 'combo1'`, destruindo a
propriedade de segredo do link. `combo_shares` **não tem policy de escrita** (§4.7): só as
funções de §4.7 a alteram. O slug é gerado exclusivamente pelo `default` da coluna.

`is_active` separa "existe um link" de "o link funciona": revogar e republicar mantém a URL
que o usuário já compartilhou, em vez de quebrá-la.

### 4.6 Integridade: perfil, `updated_at` e validade do combo

**Criação do perfil.** Nasce no banco, por trigger, para que não exista janela em que um
usuário autenticado não tenha perfil e o inventário falhe:

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
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Blader'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

O `coalesce` termina em literal porque `display_name` é `not null`: uma conta sem nome e
sem e-mail não pode derrubar o cadastro. O `on conflict` torna o trigger idempotente.

**`updated_at`** é mantido por trigger `before update` em todas as tabelas que o possuem,
nunca por responsabilidade do cliente.

**Imutabilidade de `profiles`.** A RLS não restringe colunas, então um trigger precisa
rejeitar alteração de campo que não seja `display_name`. Essa checagem e a de `updated_at`
vivem no **mesmo trigger**, e não em dois:

```sql
create function touch_profile() returns trigger
language plpgsql as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'campo imutavel em profiles';
  end if;
  new.updated_at := now();   -- ignora o valor enviado pelo cliente
  return new;
end;
$$;

create trigger profiles_before_update
  before update on profiles
  for each row execute function touch_profile();
```

Separá-los seria uma armadilha: triggers `before` disparam em ordem alfabética do nome, e
o de imutabilidade veria o `updated_at` recém-alterado pelo outro como campo proibido,
rejeitando **toda** atualização — inclusive a troca de nome, que é legítima. Fundidos, a
ordem deixa de importar.

**Validade do combo salvo.** §5.2 exige que só um combo válido seja salvo, mas com escrita
direta via RLS o cliente poderia gravar um `custom_expand` sem ratchet — e §4.7 serviria
isso a visitantes anônimos. A garantia é do banco:

```sql
create function validate_combo_slots() returns trigger
language plpgsql as $$
declare
  v_combo_id uuid;
begin
  -- NEW nao existe em DELETE e OLD nao existe em INSERT: decidir por TG_OP
  -- ANTES de referenciar qualquer um dos dois registros.
  if TG_TABLE_NAME = 'combos' then
    v_combo_id := new.id;
  elsif TG_OP = 'DELETE' then
    v_combo_id := old.combo_id;
  else
    v_combo_id := new.combo_id;
  end if;

  if exists (
    select 1 from public.combos c
    where c.id = v_combo_id
      and (
        select array_agg(cp.slot order by cp.slot) from public.combo_parts cp
        where cp.combo_id = c.id
      ) is distinct from (
        select array_agg(s.slot order by s.slot) from public.anatomy_slots s
        where s.anatomy = c.anatomy
      )
  ) then
    raise exception 'combo incompleto ou com slot invalido para a anatomia';
  end if;
  return null;
end;
$$;

create constraint trigger combo_parts_must_match_anatomy
  after insert or update or delete on combo_parts
  deferrable initially deferred
  for each row execute function validate_combo_slots();

create constraint trigger combo_must_be_complete
  after insert or update on combos
  deferrable initially deferred
  for each row execute function validate_combo_slots();
```

Três detalhes que a implementação não pode simplificar:

- **`TG_OP` decidido antes de tocar no registro.** Escrever
  `coalesce(new.combo_id, old.combo_id)` parece equivalente e não é: em PL/pgSQL, `NEW` não
  é atribuído num trigger de `DELETE` e `OLD` não é atribuído num de `INSERT`, e a
  substituição do registro acontece *antes* da avaliação do `coalesce`. A expressão falha
  em toda escrita, com `record "new"/"old" is not assigned yet`. Na prática, nenhum combo
  poderia ser salvo.
- **Dois triggers, um sobre cada tabela.** Só o de `combo_parts` deixaria passar dois casos:
  um `insert into combos` sem peça alguma (nenhum trigger dispararia, e o combo vazio
  persistiria — servido por `get_shared_combo` como zero linhas, indistinguível de link
  inválido), e um `update combos set anatomy = ...` que invalidaria um combo já salvo sem
  tocar em `combo_parts`.
- **`deferrable initially deferred`** faz a validação rodar no commit, e por isso **exige**
  que o `insert` de `combos` e o das suas peças aconteçam na mesma transação. Não é uma
  permissão, é um requisito — e é o que determina o caminho de escrita de §4.7. O `exists`
  sobre `combos` neutraliza o cascade delete: apagado o combo, não há o que validar.

Esse requisito transacional é a consequência de projeto mais importante desta seção. Via
PostgREST **cada requisição é sua própria transação**, e não existe escrita multi-tabela em
uma requisição. Um `insert` direto em `combos` seguido de outro em `combo_parts` falharia
no primeiro: o combo recém-criado ainda não tem peça alguma quando o trigger roda. Por isso
combos não são gravados por escrita direta, e sim pelas funções de §4.7.

### 4.7 RLS e funções públicas

| Tabela | Leitura | Escrita |
|---|---|---|
| `parts`, `beyblades`, `beyblade_parts`, `anatomy_slots` | Pública (`anon` + `authenticated`) | Nenhuma via API — apenas `service_role` (seed) e SQL no painel |
| `profiles` | Própria | Própria, só `display_name` (trigger de §4.6) |
| `inventory_items` | Própria | Própria |
| `combos`, `combo_parts` | **Própria apenas** | `delete` próprio; `insert`/`update` **nenhum** — só as funções abaixo |
| `combo_shares` | Própria (via `combo_id`) | **Nenhuma** — só as funções abaixo |

O catálogo é deliberadamente somente-leitura pela API. Não existe tela de administração;
correções entram por SQL, como decidido.

**Gravação de combos.** O trigger de §4.6 exige que combo e peças cheguem na mesma
transação, e o PostgREST dá uma transação por requisição. Logo, `insert` e `update` de
`combos`/`combo_parts` não são expostos ao cliente: a escrita passa por duas funções
`security definer`, restritas ao dono, que fazem tudo de uma vez:

```sql
create function save_combo(p_name text, p_anatomy anatomy, p_notes text, p_parts jsonb)
returns uuid ...
-- insere em combos e em combo_parts na mesma transação, devolve o id

create function update_combo(p_combo_id uuid, p_name text, p_anatomy anatomy,
                             p_notes text, p_parts jsonb)
returns void ...
-- substitui nome, anatomia e o conjunto inteiro de peças, também atômico
```

`p_parts` é um array JSON de `{slot, part_id}`. Trocar a anatomia de um combo salvo só é
possível por aqui, porque exige alterar `combos` e `combo_parts` juntos — por escrita
direta, a primeira requisição já invalidaria o combo.

`delete` continua por RLS direta: apagar é atômico e o cascade cuida das peças.

Este é o mesmo padrão de `share_combo`, e a mesma razão de §10: sem backend, toda regra de
integridade que não couber numa constraint tem de morar numa função do banco.

**Combo compartilhado.** Não existe policy de leitura pública em `combos`. Uma policy do
tipo "leitura se público" permitiria a qualquer visitante *listar todos* os combos públicos
do site, bem mais amplo do que "link secreto opcional". O acesso exige conhecer o slug:

```sql
create extension if not exists pgcrypto;

-- 12 caracteres de um alfabeto sem ambiguidade visual: 31^12 ~ 7.9e17 combinações
create function gen_share_slug() returns text
language sql volatile as $$
  select string_agg(
    substr('23456789abcdefghjkmnpqrstuvwxyz', (get_byte(b, i) % 31) + 1, 1), ''
  )
  from (select gen_random_bytes(12) as b) s, generate_series(0, 11) as i;
$$;

create function get_shared_combo(p_slug text)
returns table (
  combo_name text, anatomy anatomy, notes text,
  author_name text, part_id uuid, slot part_slot
)
language sql stable security definer set search_path = '' as $$
  select c.name, c.anatomy, c.notes, pr.display_name, cp.part_id, cp.slot
  from public.combo_shares sh
  join public.combos      c  on c.id = sh.combo_id
  join public.profiles    pr on pr.id = c.profile_id
  join public.combo_parts cp on cp.combo_id = c.id
  where sh.slug = p_slug and sh.is_active;
$$;

grant execute on function get_shared_combo(text) to anon, authenticated;
```

Funções irmãs `share_combo(uuid)` e `revoke_combo_share(uuid)`, ambas `security definer` e
restritas ao dono do combo, são o único caminho de escrita em `combo_shares`.
`share_combo` é **upsert**, não insert:

```sql
insert into public.combo_shares (combo_id) values (p_combo_id)
on conflict (combo_id) do update set is_active = true;
```

A PK é `combo_id`, então um `insert` simples falharia ao republicar um combo revogado — e
gerar uma linha nova quebraria a URL que o usuário já compartilhou, anulando a razão de
`is_active` existir.

**Ordem de execução da migration.** A leitura acima é didática, não cronológica:
`create extension pgcrypto` e `gen_share_slug()` precisam existir antes de `combo_shares`
(§4.5), que usa a função como `default` de coluna.

`get_shared_combo` devolve o `display_name` do autor — a única informação de perfil que sai
para um visitante anônimo, e sai por escolha explícita de quem compartilhou.

### 4.8 Hasbro: schema e resolução

A marca existe em `parts` e em `beyblades` desde a migration inicial porque
`unique (brand, slot, name)` e as FKs compostas não se acrescentam depois sem migrar dados.

Regras:

- Peças e beys Hasbro são **registros próprios**, com os nomes que a Hasbro usa.
- `equivalent_id` aponta **sempre da Hasbro para a Takara Tomy**, nunca o contrário e nunca
  entre registros da mesma marca. O banco garante a ausência de auto-referência; a direção
  é validada no teste de integridade do seed, que enxerga a marca dos dois lados.
- **Toda peça Hasbro tem equivalente Takara Tomy obrigatório**, verificado no seed. Não há
  peça exclusiva da Hasbro no catálogo: se surgir uma, ela entra como peça canonical
  própria (marca `hasbro`, `equivalent_id` nulo) e o teste de seed é ajustado junto com a
  regra de resolução — o que exige decisão consciente, e não silêncio.
- O catálogo mostra **Takara Tomy por padrão**, com alternância para Hasbro, evitando exibir
  o mesmo bey duas vezes numa lista que o usuário lê como "todos os beys".

**Resolução.** A camada de dados (§3.1) troca todo `part_id` Hasbro pelo seu equivalente
canonical antes de entregar qualquer coisa ao motor. Isso vale para o catálogo, para a
seleção no laboratório e — de forma crítica — para o estoque derivado de §4.9. O motor
nunca vê marca.

**Invariante:** `combo_parts` guarda somente `part_id` canonical. A resolução acontece na
seleção, antes da gravação, e não na leitura. Como a resolução também roda na leitura, um
combo com peça Hasbro gravada ainda funcionaria — mas os combos ficariam com procedência
mista e a comparação direta entre eles deixaria de ser confiável.

### 4.9 Estoque de peças derivado

O usuário registra beys, nunca peças soltas. O estoque de peças disponíveis para montagem
sai do inventário de beys — possuir duas cópias de "Dran Sword 3-60F" significa possuir
dois blades Dran Sword, dois ratchets 3-60 e dois bits F:

```sql
create view user_parts with (security_invoker = true) as
select
  i.profile_id,
  coalesce(p.equivalent_id, bp.part_id) as part_id,   -- resolve Hasbro -> canonical
  bp.slot,
  sum(i.quantity)::int as quantity
from inventory_items i
join beyblade_parts bp on bp.beyblade_id = i.beyblade_id
join parts          p  on p.id = bp.part_id
where i.status = 'owned'
group by i.profile_id, coalesce(p.equivalent_id, bp.part_id), bp.slot;
```

O `coalesce` é indispensável e não é um detalhe da onda 6: sem ele, um bey Hasbro no
inventário faria o laboratório afirmar que o usuário **não possui** uma peça que possui,
porque compararia o `part_id` Hasbro com o canonical usado na montagem.

`security_invoker = true` também é obrigatório: sem ele a view roda com os privilégios do
criador e vaza o inventário de todos os usuários, ignorando o RLS da tabela base.

**Caminho inverso (peça ausente → wishlist).** Quando o laboratório detecta uma peça que o
usuário não possui, ele precisa oferecer *qual bey comprar*. A consulta é o inverso da view
acima — os beys que contêm aquela peça — ordenados por raridade crescente e data de
lançamento decrescente, isto é, o mais fácil de achar primeiro. **O usuário escolhe qual
bey vai para a wishlist**; o app não decide por ele, porque o critério real (preço,
disponibilidade local, querer as outras peças do bey) não está no banco.

**Para o visitante anônimo**, o laboratório não exibe alerta de posse — ele não tem
inventário com que comparar. No lugar, um convite discreto a entrar para acompanhar o que
já possui. O laboratório em si funciona por inteiro sem conta.

### 4.10 Storage

Bucket `bey-images`, **público para leitura**, escrita restrita a `service_role`. As
imagens são servidas pela CDN do Supabase; `parts.image_path` e `beyblades.image_path`
guardam o caminho relativo dentro do bucket, não a URL completa, para que trocar de host
não exija migração de dados.

## 5. Motor de análise

Módulo TypeScript puro em `src/lib/engine/`, sem dependência de React nem de rede. Recebe
peças já resolvidas para canonical (§3.1). É o coração do produto, e é o único **código de
aplicação** com testes automatizados (os dados de seed também são testados — ver §9).

| Arquivo | Responsabilidade | Onda |
|---|---|---|
| `types.ts` | Tipos de peça, combo e resultado de análise | 3 |
| `slots.ts` | Quais slots cada anatomia exige | 3 |
| `compatibility.ts` | Valida se um conjunto de peças forma um bey legal | 3 |
| `stats.ts` | Agrega atributos do combo | 3 |
| `archetype.ts` | Classifica o combo em um arquétipo legível | 3 |
| `explain.ts` | Contribuição de cada peça em cada atributo | 3 |
| `normalization.ts` | Deriva o contexto de normalização a partir do catálogo | 3 |
| `battle.ts` | Confronto especulativo entre dois combos | **5 — fora do escopo deste design** |

### 5.1 Slots por anatomia (`slots.ts`)

```
basic          : blade, ratchet, bit
unique         : blade, ratchet, bit
unique_expand  : integrated_blade, bit
custom         : lock_chip, main_blade, assist_blade, ratchet, bit
custom_expand  : lock_chip, metal_blade, over_blade, assist_blade, ratchet, bit
```

> **Corrigido em 02/09/2026.** A tabela original dava quatro slots à `unique`,
> incluindo `assist_blade` — o Assist Blade é exclusivo da Custom Line, e a Unique Line
> usa três peças, igual à Basic. `unique_expand` nasceu na Onda 1: é o UX Expand Blade,
> em que a catraca vem embutida na lâmina, deixando o bey com duas peças.

Gerado do mesmo arquivo de dados que popula `anatomy_slots` (§4.3), de modo que banco e
motor não podem divergir. Cada slot comporta **exatamente uma peça** (§4.1).

### 5.2 Compatibilidade (`compatibility.ts`)

Um combo é **válido** quando:

1. Todo slot exigido pela anatomia está preenchido com exatamente uma peça, e nenhum slot
   fora dela está ocupado.
2. Cada peça tem `slot` igual ao slot que ocupa (garantido também pela FK composta).

Um combo é **incompleto** quando faltam slots mas nenhuma regra é violada. Esse é o estado
normal durante a montagem: o laboratório **analisa combos incompletos**, exibindo os
atributos parciais acumulados e marcando explicitamente quais slots ainda faltam. Só um
combo válido pode ser salvo ou compartilhado — garantido no banco por §4.6.

A marca não aparece nestas regras porque a resolução acontece antes do motor (§3.1, §4.8).

`parts.line` registra **a linha em que a peça estreou**, e não restringe onde ela pode ser
usada — compatibilidade é determinada pelo slot, não pela linha. Um Ratchet lançado na BX
é legal em um combo `custom_expand`. Esta é a razão de `line` não participar de nenhuma
regra de validação.

### 5.3 Agregação (`stats.ts`)

Opera na **escala bruta** dos dados; a normalização é de apresentação (§5.4).

```
attack   = soma de part.attack   sobre todos os slots preenchidos
defense  = soma de part.defense
stamina  = soma de part.stamina
weight_g = soma de part.weight_g

burst_resistance = mínimo entre ratchet.burst_resistance e bit.burst_resistance
height_mm        = ratchet.height_mm
spin_direction   = primeiro presente entre: blade -> main_blade -> metal_blade
```

Regras de borda, todas testadas:

- **Ordinal de `resistance`:** `very_low`=1, `low`=2, `medium`=3, `high`=4, `very_high`=5.
- **Slot ausente e coluna nula são o mesmo caso** para os atributos derivados: se o ratchet
  ainda não foi escolhido, ou se sua `burst_resistance` é nula, o valor não participa do
  mínimo. Se nenhum dos dois contribuir, o resultado é `desconhecido` — e a interface diz
  isso, em vez de exibir um número inventado. Idem para `height_mm` e `spin_direction`.
- **`weight_g` nulo conta como zero**, e o total é marcado como parcial, para que a soma
  nunca seja apresentada como exata quando não é.
- **Lock Chip não participa** do cálculo de burst. A retenção depende do encaixe entre
  ratchet e bit; o Lock Chip prende as lâminas entre si.
- **`spin_direction` igual a `dual`** é propagado como `dual`; seu tratamento em confronto
  pertence ao design da onda 5. Como só a lâmina principal carrega a coluna (§4.4), não
  existe conflito entre lâminas a resolver.

### 5.4 Normalização das barras (apresentação)

Cada atributo é exibido em 0–100. O denominador é o **máximo teórico da anatomia do combo**:
para cada slot da anatomia, o maior valor daquele atributo entre todas as peças canonical
do catálogo que ocupam aquele slot, somados.

Escolhi o máximo teórico e não o máximo entre os beys de fábrica porque o produto é sobre
híbridos: uma barra que estoura os 100% quando o usuário monta algo melhor que qualquer bey
de fábrica seria um bug visível.

O denominador é derivado do **catálogo completo** e recalculado quando ele carrega — daí a
exigência de prefetch integral em §3.3. Quem o calcula é `normalization.ts` (§3.1),
recebendo o catálogo como argumento; a apresentação apenas aplica o resultado às barras.

### 5.5 Arquétipo (`archetype.ts`)

A classificação usa os três atributos **normalizados** (§5.4), recebidos como entrada:

- **Dominante** — o maior dos três. Se ele exceder o segundo em pelo menos 15 pontos, o
  arquétipo é puro: `Ataque`, `Defesa` ou `Stamina`.
- Caso contrário, o arquétipo é `Equilibrado`, qualificado pelos dois maiores
  (ex.: `Equilibrado — Ataque/Stamina`).
- **Qualificadores de burst:** `frágil` se `burst_resistance` ≤ 2; `resistente` se ≥ 4.
  Burst `desconhecido` **não recebe qualificador algum** — ausência de dado não é fragilidade.
- **Qualificadores de peso:** `pesado` ou `leve` conforme o peso total do combo caia no
  quartil superior ou inferior da **distribuição de pesos totais dos beys de fábrica do
  catálogo**. Essa população é a certa porque é a referência que o usuário tem na mão; os
  quartis são calculados junto com o denominador de §5.4. **Beys de fábrica cujo peso total
  seja parcial — alguma peça com `weight_g` nula — ficam fora da população**, pois puxariam
  a distribuição para baixo e produziriam `pesado` com folga demais. Um combo de peso
  parcial (§5.3) também não recebe qualificador.

Empate exato entre atributos é resolvido na ordem fixa Ataque > Defesa > Stamina, para que
a classificação seja determinística e testável.

### 5.6 Transparência (`explain.ts`)

A interface nunca mostra um número sem origem. `explain.ts` devolve a contribuição de cada
peça **na escala bruta de §5.3**, a mesma unidade de `stats.ts`, de modo que a soma das
contribuições reproduz exatamente o total agregado — propriedade que §9 testa. A conversão
para a escala das barras é feita na apresentação, aplicando o mesmo denominador ao total e
às parcelas.

Assim, num combo cujo Ataque bruto é 88, o usuário vê que 60 vieram do blade, 13 do ratchet
e 15 do bit. Além de ser mais útil, isso preserva o valor do parecer da IA na fase 2: ela
complementa a análise em vez de competir com uma caixa-preta.

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
   Zod antes de qualquer escrita. `data/anatomies.json` é a origem tanto de `anatomy_slots`
   quanto de `slots.ts`.
3. `npm run seed` valida e envia ao Supabase usando a chave `service_role`. É
   **idempotente**: reexecutar não duplica nem apaga, faz upsert por chave natural
   (`brand + slot + name` para peças, `brand + release_code + name` para beys).
   **Exceção:** `anatomy_slots` é sincronizada de forma destrutiva (§4.3) — linhas ausentes
   de `data/anatomies.json` são apagadas. É a única tabela com esse tratamento, porque é
   tabela de referência sem dado de usuário e é a fonte de verdade do trigger de validade
   de combos; uma linha obsoleta ali faria o banco aceitar um combo com slot que a anatomia
   já não tem.
4. `npm run seed:images` baixa as artes, otimiza e envia ao bucket `bey-images`, também de
   forma idempotente.
5. `npm run types` regenera `src/types/database.ts` a partir do schema.
6. Manutenção posterior por SQL no painel, documentada em `SUPABASE_ADMIN.md`.

Volume estimado: cerca de 86 blades, 35 ratchets, 52 bits, mais as peças CX, e cerca de
150 beys.

## 7. Estrutura do projeto

```
data/                        # seed versionado (JSON revisável por diff)
  anatomies.json             # origem de anatomy_slots e de slots.ts
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
    useCatalog.ts            # resolve equivalências Hasbro -> canonical
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
| **6 — Hasbro** | Curadoria dos dados Hasbro e alternância de marca no catálogo | Schema e resolução prontos (§4.8) |
| **7 — IA local** | Edge Function, Cloudflare Tunnel, Ollama e parecer da IA no laboratório | **Design próprio antes de iniciar** |

As ondas 1 a 3 cobrem o que o usuário classificou como imprescindível. Recomenda-se
publicar cada onda assim que pronta, mas **anunciar publicamente ao fim da onda 3** — isso
permite validar os dados do catálogo com uso real antes de construir o laboratório sobre
eles.

A curadoria Hasbro fica na onda 6, e não na 1, porque mapear equivalências sem a base
Takara Tomy completa e revisada duplicaria o retrabalho. O *schema* e a *resolução* que a
suportam, porém, nascem nas ondas 0 e 3.

**Cada onda recebe seu próprio plano de implementação.** Este documento é o design; não
deve virar um plano único.

## 9. Testes

Vitest, cobrindo:

- **`stats.ts`** — agregação dos três atributos; regra do mínimo no burst; slot ausente e
  coluna nula tratados como o mesmo caso; resultado `desconhecido` quando ninguém
  contribui; peso parcial; exclusão do Lock Chip; precedência de `spin_direction`.
- **`compatibility.ts`** — combo válido, incompleto e inválido nas quatro anatomias; peça
  em slot errado; slot fora da anatomia; peça de linha diferente sendo aceita.
- **`archetype.ts`** — arquétipo puro, equilibrado, cada qualificador, burst desconhecido
  sem qualificador, peso parcial sem qualificador, e o desempate determinístico.
- **`explain.ts`** — a soma das contribuições reproduz o total agregado bruto, em todas as
  anatomias.
- **`normalization.ts`** — denominador por atributo em cada anatomia; quartis de peso com e
  sem beys de peso parcial na população; catálogo vazio ou com um único bey.
- **`slots.ts`** — paridade com `data/anatomies.json`.
- **Integridade do seed** — todo bey com o conjunto de slots exato de sua anatomia; ausência
  de duplicatas por chave natural; atributos dentro da faixa; toda peça referenciada
  existindo; `source_url` presente em todo registro; toda peça e todo bey `hasbro` com
  `equivalent_id` apontando para um registro `takara_tomy`.
- **Colunas restritas a certos slots** — `spin_direction` preenchida apenas na lâmina
  principal, `height_mm` apenas em `ratchet`, `dash_performance` apenas em `bit`, e nulas
  em todos os demais slots. As três têm comentário restritivo no schema (§4.4) e nada além
  do teste as faz valer.
- **Paridade banco ↔ arquivo** — `anatomy_slots` no banco reproduz exatamente
  `data/anatomies.json` após o seed. Sem este teste, a afirmação de §4.3 de que banco e
  motor não podem divergir dependeria apenas da sincronização destrutiva ter funcionado.

A interface segue sem testes automatizados, como no Trocação.

## 10. Riscos e questões em aberto

| Risco | Tratamento |
|---|---|
| Os atributos por peça vêm em boa parte de **medições da comunidade**, não de folha oficial da Takara Tomy | `source_url` obrigatório por registro e página `/creditos` com as fontes |
| As **imagens são arte oficial** Takara Tomy/Hasbro, usadas por fã | Decisão consciente do usuário; risco assumido por ele. Créditos visíveis e remoção mediante pedido |
| A **curadoria de ~170 peças e ~150 beys é trabalho manual** e é o item mais demorado do projeto | Isolada na onda 1; validação Zod e testes de integridade pegam erro de digitação |
| A **simulação de batalha é especulativa** | Fora do escopo deste design; aviso explícito e permanente quando existir |
| O acesso do MCP ao Supabase é de **escrita** (migrations exigem) | Escopado com `project_ref` ao projeto `gbcpfsczjivtwkyheihu`, isolado do Trocação |
| Lançamentos novos mudam a composição | `anatomy`, `part_slot` e `anatomy_slots` absorvem sem migração; foi o motivo da escolha |
| **Sem backend, toda regra de integridade tem de estar no banco** — o cliente é a superfície de escrita | FKs compostas, `check`s, trigger de validade de combo (§4.6) e `combo_shares` sem policy de escrita (§4.7) |
| O laboratório é público e o motor roda no cliente | Aceito: o catálogo já é público e o cálculo não contém segredo comercial |
