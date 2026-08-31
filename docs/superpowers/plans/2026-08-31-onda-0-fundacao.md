# Onda 0 — Fundação — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar o Blade X Lab de ponta a ponta — scaffold, schema completo com RLS, funções e triggers, tema, PWA — até uma página no ar na Vercel que lê o banco e prova que o caminho navegador → Supabase → RLS funciona.

**Architecture:** SPA em Vite + React 19 + TypeScript, sem backend próprio; o cliente fala com o Supabase por `supabase-js` sob RLS. O schema vai como migrations SQL versionadas no repositório e aplicadas pelo MCP hospedado do Supabase. Como não há servidor no meio, **toda regra de integridade mora no banco** — constraints, triggers e funções `security definer`.

**Tech Stack:** React 19, Vite 8, TypeScript 5, `@supabase/supabase-js`, `react-router-dom`, `vite-plugin-pwa`, Vitest, Vercel, Postgres 15+ (Supabase).

**Spec:** [`docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`](../specs/2026-08-31-blade-x-lab-design.md)

---

## Restrições globais

- TypeScript em todo o `src/` (spec §3).
- **Sem framework CSS.** Estilo vive em `theme.ts` e em props `style` inline, como no Trocação (spec §3).
- Valores armazenados em inglês; texto de interface em pt-BR (spec §4.2).
- Tabelas de catálogo são somente-leitura pela API: nenhuma policy de `insert`/`update`/`delete` para `anon`/`authenticated` (spec §4.7).
- Toda view que lê dado de usuário é `security_invoker = true` (spec §4.9).
- `updated_at` é mantido por trigger, nunca por código de cliente (spec §4.6).
- Projeto Supabase é `gbcpfsczjivtwkyheihu` (BLADEXLAB, us-east-1). **Nunca apontar migration ou variável de ambiente para outro projeto.**
- A `service_role` key nunca entra no repositório nem no bundle. Só a `anon` key vai para o cliente — ela é pública por natureza.

### Desvio do spec registrado neste plano

**PWA.** O spec descreve a estratégia de cache (§3.3) mas não o meio. Este plano usa **`vite-plugin-pwa`** (Workbox) em vez do `sw.js` escrito à mão do Trocação, porque a estratégia *stale-while-revalidate* do catálogo sai declarativa em vez de manual.

**`get_shared_combo`.** A coluna de retorno que o spec §4.7 chama de `anatomy` sai aqui como `combo_anatomy`. O nome do spec colidiria com o tipo `anatomy` na declaração `returns table`. A onda 4 consome esse nome.

---

## Pré-requisito manual (antes da Task 6)

O MCP do Supabase ainda não está registrado. É configuração do Claude Code, não do repositório, então precisa ser feita uma vez fora da sessão de implementação:

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=gbcpfsczjivtwkyheihu"
```

Depois, abrir uma sessão `claude` interativa e rodar `/mcp` para o login OAuth.

**Não adivinhe os nomes das ferramentas do MCP** — eles variam por versão do servidor. Descubra com `ToolSearch({query: "supabase", max_results: 30})` e use os nomes que aparecerem. Este plano se refere a elas por função (*aplicar migration*, *executar SQL*), não por nome.

As Tasks 1–5 não dependem do MCP e podem ser feitas antes.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | Scaffold e build |
| `src/main.tsx` | Bootstrap e rotas |
| `src/App.tsx` | Casca da aplicação |
| `src/theme.ts` | Paleta única; nenhuma cor literal fora daqui |
| `src/lib/supabase.ts` | Cliente único do Supabase |
| `src/types/database.ts` | Tipos gerados do schema |
| `data/anatomies.json` | Fonte de verdade das anatomias (spec §4.3) |
| `scripts/sync-anatomies.ts` | Sincroniza `anatomy_slots` destrutivamente |
| `supabase/migrations/*.sql` | Schema versionado, uma migration por responsabilidade |
| `supabase/tests/schema_checks.sql` | Verificações executáveis das regras do banco |

As migrations são divididas por responsabilidade, e não em um arquivo único, para que uma falha de aplicação diga *o que* falhou:

```
0001_enums.sql              tipos
0002_catalog.sql            anatomy_slots, parts, beyblades, beyblade_parts
0003_user_data.sql          profiles, inventory_items, combos, combo_parts, combo_shares
0004_functions_triggers.sql gen_share_slug, handle_new_user, touch_profile,
                            set_updated_at, validate_combo_slots + triggers
0005_rls.sql                habilita RLS e cria as policies
0006_rpc.sql                save_combo, update_combo, share_combo,
                            revoke_combo_share, get_shared_combo
0007_views.sql              user_parts
0008_storage.sql            bucket bey-images
```

Ordem importa: `0004` cria `gen_share_slug`, mas `0003` já a usa como `default`. Por isso `0003` cria a tabela `combo_shares` **sem** o default, e `0004` o adiciona com `alter table`. Alternativa rejeitada: mover a função para `0001`, o que misturaria função com tipos.

---

## Chunk 1: Scaffold do frontend

### Task 1: Scaffold Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`

**Interfaces:** produz um `App` exportado como default de `src/App.tsx`, montado por `src/main.tsx`. Tasks 3, 5 e 15 editam esses arquivos.

- [ ] **Step 1: Criar `.gitignore` antes de qualquer coisa**

Primeiro, para que nenhum segredo ou artefato seja rastreado por acidente:

```
node_modules
dist
dist-ssr
*.local
.env
.env.*
!.env.example
.vercel
.DS_Store
coverage
```

- [ ] **Step 2: Criar `package.json`**

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
    "test:watch": "vitest",
    "sync:anatomies": "tsx scripts/sync-anatomies.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.105.3",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-router-dom": "^7.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vite": "^8.0.10",
    "vite-plugin-pwa": "LEIA O STEP 3",
    "vitest": "LEIA O STEP 3"
  }
}
```

`@types/node` não é opcional: o `tsconfig.json` inclui `scripts/`, e `scripts/sync-anatomies.ts` (Task 13) usa `node:fs` e `process.env`. Sem ele, `tsc -b` falha com `Cannot find module 'node:fs'`.

- [ ] **Step 3: Resolver as versões de `vitest` e `vite-plugin-pwa` compatíveis com Vite 8**

**Não copie versões deste plano para estes dois pacotes.** Ambos declaram peer dependency sobre o Vite, e as faixas mudam a cada major do Vite. Descubra as compatíveis antes de instalar:

```bash
npm view vitest peerDependencies && npm view vite-plugin-pwa peerDependencies
```

Escolha as versões cuja faixa de peer inclua `vite@8` e escreva-as no `package.json`. Se nenhuma versão publicada suportar Vite 8, a decisão é sua e deve ser registrada: baixar o Vite para a major suportada, ou trocar o plugin de PWA.

- [ ] **Step 4: Instalar**

Run: `npm install`
Expected: termina sem `ERESOLVE`. Se conflitar, **volte ao Step 3 e ajuste a versão — nunca use `--force`**. O `--force` esconde incompatibilidade real que reaparece no build da Vercel, onde é bem mais caro diagnosticar.

- [ ] **Step 5: Criar `tsconfig.json` e `tsconfig.node.json`**

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
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "scripts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`noUncheckedIndexedAccess` é deliberado: o motor da onda 3 indexa peças por slot, e sem essa flag um slot ausente vira `undefined` silencioso — exatamente o caso de borda que o spec §5.3 manda tratar.

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

`composite: true` é obrigatório: o script de build é `tsc -b`, e em build mode todo projeto referenciado sem `composite` faz o TypeScript abortar com TS6306. Sem ele, o Step 9 desta task falha.

- [ ] **Step 6: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Blade X Lab</title>
    <meta name="description" content="Catálogo de Beyblade X e laboratório de combinação de peças." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Criar `vite.config.ts` (Vitest entra na Task 2, PWA na Task 4)**

O import vem de `vitest/config` desde já — o Vitest foi instalado no Step 4, e começar por `vite` obrigaria a trocar o import na Task 2, que é justamente onde esse detalhe vira erro de compilação.

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
  server: { port: 5173 },
});
```

- [ ] **Step 8: Criar `src/App.tsx` e `src/main.tsx` mínimos**

`src/App.tsx`:

```tsx
export default function App() {
  return <h1>Blade X Lab</h1>;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado no index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Verificar que compila e roda**

Run: `npm run build`
Expected: termina com `built in ...` e cria `dist/`. Sem erro de TypeScript.

- [ ] **Step 10: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.tsx src/App.tsx
git commit -m "feat: scaffold Vite + React 19 + TypeScript"
```

---

### Task 2: Configurar Vitest com um teste que prova o arranjo

**Files:**
- Modify: `vite.config.ts`
- Create: `src/lib/env.ts`, `src/lib/env.test.ts`

Um teste trivial não prova nada. Vamos usar a primeira função real que precisamos de qualquer jeito — a leitura validada das variáveis de ambiente — para provar que o Vitest funciona.

- [ ] **Step 1: Escrever o teste que falha**

`src/lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env.ts";

describe("readSupabaseEnv", () => {
  it("devolve as duas variáveis quando ambas estão presentes", () => {
    const env = readSupabaseEnv({
      VITE_SUPABASE_URL: "https://exemplo.supabase.co",
      VITE_SUPABASE_ANON_KEY: "chave-anon",
    });
    expect(env).toEqual({
      url: "https://exemplo.supabase.co",
      anonKey: "chave-anon",
    });
  });

  it("lança erro nomeando a variável que falta", () => {
    expect(() => readSupabaseEnv({ VITE_SUPABASE_URL: "https://exemplo.supabase.co" }))
      .toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it("trata string vazia como ausente", () => {
    expect(() => readSupabaseEnv({ VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "k" }))
      .toThrow(/VITE_SUPABASE_URL/);
  });
});
```

O terceiro caso existe porque a Vercel entrega variável não configurada como string vazia, não como `undefined` — falhar aqui com mensagem clara evita uma hora de depuração cega em produção.

- [ ] **Step 2: Adicionar a seção `test` ao `vite.config.ts`**

O import vem de `vitest/config`, **não** de `vite`. A propriedade `test` não existe no `UserConfig` do Vite, e `vite.config.ts` está dentro do `tsconfig.node.json` — importar de `vite` compila aqui (o Vitest não checa tipo em runtime) mas quebra o `npm run build` da Task 3 com `'test' does not exist in type 'UserConfig'`.

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
  server: { port: 5173 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./env.ts"` ou `readSupabaseEnv is not a function`.

- [ ] **Step 4: Implementar o mínimo**

`src/lib/env.ts`:

```ts
export type SupabaseEnv = { url: string; anonKey: string };

/** Lê e valida as variáveis do Supabase. Recebe o objeto de ambiente para ser testável. */
export function readSupabaseEnv(source: Record<string, string | undefined>): SupabaseEnv {
  const url = source["VITE_SUPABASE_URL"]?.trim();
  const anonKey = source["VITE_SUPABASE_ANON_KEY"]?.trim();

  if (!url) throw new Error("Variável de ambiente ausente: VITE_SUPABASE_URL");
  if (!anonKey) throw new Error("Variável de ambiente ausente: VITE_SUPABASE_ANON_KEY");

  return { url, anonKey };
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS — `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/lib/env.ts src/lib/env.test.ts
git commit -m "test: configura Vitest e valida leitura das variaveis do Supabase"
```

---

### Task 3: Criar `src/theme.ts`

**Files:**
- Create: `src/theme.ts`
- Modify: `src/App.tsx`

O Trocação centraliza a paleta em `theme.js` e importa `T` em todo componente. Mesmo padrão aqui, em TS.

- [ ] **Step 1: Escrever `src/theme.ts`**

Paleta escura, condizente com o tema de laboratório e arena. Nenhum componente pode escrever cor literal fora deste arquivo.

```ts
// ─── TEMA BLADE X LAB ────────────────────────────────────────────────────────
// Paleta centralizada — importar de qualquer componente sem risco de import circular
export const T = {
  bgPage:        "#0b0e14",
  bgApp:         "#11151f",
  bgCard:        "#171c28",
  bgCardHover:   "#1e2433",
  bgHeader:      "#0b0e14",
  bgNav:         "#11151f",
  bgInput:       "#1e2433",

  accent:        "#00d4ff",   // ciano — ação primária, energia
  accentDim:     "#0891b2",
  accentWarm:    "#ff6b35",   // laranja — destaque e alerta de posse

  typeAttack:    "#ff4757",
  typeDefense:   "#3742fa",
  typeStamina:   "#2ed573",
  typeBalance:   "#ffa502",

  textPrimary:   "#e8ecf1",
  textSecondary: "#9aa5b8",
  textMuted:     "#5c6780",
  textOnAccent:  "#0b0e14",

  border:        "#252c3d",
  borderStrong:  "#354055",

  ok:            "#2ed573",
  warn:          "#ffa502",
  danger:        "#ff4757",
} as const;

export type ThemeColor = keyof typeof T;
```

As quatro cores `type*` correspondem ao enum `bey_type` do banco (spec §4.2) e serão usadas para colorir natureza no catálogo.

- [ ] **Step 2: Usar o tema no `App.tsx` para provar que a importação funciona**

```tsx
import { T } from "./theme.ts";

export default function App() {
  return (
    <div style={{ minHeight: "100dvh", background: T.bgPage, color: T.textPrimary }}>
      <h1 style={{ padding: 24, margin: 0 }}>Blade X Lab</h1>
    </div>
  );
}
```

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: sucesso, sem erro de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/theme.ts src/App.tsx
git commit -m "feat: paleta central em theme.ts"
```

---

### Task 4: PWA instalável

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `public/favicon.svg`

O spec §3.3 pede cache do app shell e do catálogo com *stale-while-revalidate*. O catálogo só existe a partir da onda 1; aqui fica o app shell e a regra de runtime já preparada.

- [ ] **Step 1: Criar um ícone provisório em `public/favicon.svg`**

Ícone definitivo é trabalho de design, fora do escopo desta onda. Um SVG serve para o manifest validar:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b0e14"/>
  <circle cx="32" cy="32" r="19" fill="none" stroke="#00d4ff" stroke-width="5"/>
  <circle cx="32" cy="32" r="6" fill="#ff6b35"/>
</svg>
```

- [ ] **Step 2: Adicionar `vite-plugin-pwa` ao `vite.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Blade X Lab",
        short_name: "Blade X Lab",
        description: "Catálogo de Beyblade X e laboratório de combinação de peças.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0e14",
        theme_color: "#0b0e14",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        runtimeCaching: [
          {
            // Catálogo: stale-while-revalidate (spec §3.3).
            // Só as tabelas públicas — nunca dados de usuário.
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              /\/rest\/v1\/(parts|beyblades|beyblade_parts|anatomy_slots)/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "catalogo",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  build: { outDir: "dist" },
  server: { port: 5173 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

O `urlPattern` lista as tabelas explicitamente, em vez de casar `/rest/v1/*`. Um padrão amplo cachearia `inventory_items` e `combos` no disco do dispositivo — dado de usuário em cache compartilhado é vazamento, especialmente em aparelho de uso comum.

- [ ] **Step 3: Ícones PNG do manifest**

Um SVG basta para instalar em navegadores modernos, mas Android pede PNG para a tela inicial. Gere `public/logo-192.png` e `public/logo-512.png` a partir do SVG e acrescente ao array `icons`, incluindo uma entrada `purpose: "maskable"`. Se não houver ferramenta de conversão disponível no ambiente, **deixe esta etapa registrada como pendência da onda 1** em vez de inventar um binário.

- [ ] **Step 4: Verificar que o manifest é gerado**

Run: `npm run build`
Expected: sucesso, e `dist/manifest.webmanifest` e `dist/sw.js` existem.

Run: `ls dist/manifest.webmanifest dist/sw.js`
Expected: os dois caminhos listados.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts package.json package-lock.json public/favicon.svg
git commit -m "feat: PWA instalavel com cache stale-while-revalidate do catalogo"
```

---

### Task 5: Cliente Supabase

**Files:**
- Create: `src/lib/supabase.ts`, `.env.example`
- Modify: nenhum

- [ ] **Step 1: Criar `.env.example`** (versionado; o `.env` real não é)

```
# Painel do Supabase > Project Settings > API
# A anon key e publica por natureza: ela vai no bundle do frontend.
# NUNCA coloque a service_role key aqui nem em qualquer arquivo versionado.
VITE_SUPABASE_URL=https://gbcpfsczjivtwkyheihu.supabase.co
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 2: Criar o `.env` local**

Copie `.env.example` para `.env` e preencha a `anon key` a partir do painel. Confirme que o `.gitignore` da Task 1 já a exclui:

Run: `git check-ignore -v .env`
Expected: uma linha apontando para a regra `.env` do `.gitignore`. Se não sair nada, **pare** e corrija o `.gitignore` antes de seguir.

- [ ] **Step 3: Criar `src/lib/supabase.ts`**

```ts
import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./env.ts";

const { url, anonKey } = readSupabaseEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
);

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

Diferente do Trocação, que apenas registra um `console.error` quando falta variável, aqui `readSupabaseEnv` lança. Uma tela em branco com erro claro no console é melhor que um app que carrega e falha em toda consulta sem explicar por quê.

- [ ] **Step 4: Verificar o build**

Run: `npm run build`
Expected: sucesso.

**Atenção à expectativa:** o build **não** falha por variável ausente. O Vite substitui `import.meta.env` textualmente e não executa o topo dos módulos; o `throw` de `readSupabaseEnv` só acontece no navegador. Variável faltando aparece como tela em branco com o erro no console — não como build quebrado. Não perca tempo procurando no log de build.

- [ ] **Step 5: Commit**

```bash
git add .env.example src/lib/supabase.ts
git commit -m "feat: cliente Supabase com validacao de ambiente"
```

---

**Fim do Chunk 1.** Neste ponto existe um app que compila, tem testes rodando, tema, PWA e cliente do banco — mas nenhuma tabela.

---

## Chunk 2: Schema do banco

> **Depende do pré-requisito manual** (MCP do Supabase registrado).
>
> Cada task deste chunk segue o mesmo ritmo: escrever o arquivo em `supabase/migrations/`, aplicá-lo pelo MCP com o mesmo nome, confirmar, commitar. Manter o arquivo no repositório **e** aplicar pelo MCP é o que dá versionamento sem o CLI instalado.

### Task 6: Migration `0001_enums.sql`

**Files:**
- Create: `supabase/migrations/0001_enums.sql`

- [ ] **Step 1: Escrever a migration**

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

A ordem de declaração de `rarity` e `resistance` é significativa (spec §4.2): as duas são comparadas por ordem de enum. Valores futuros vão nas extremidades.

- [ ] **Step 2: Aplicar via MCP**

Use a ferramenta de aplicar migration do MCP do Supabase, com nome `0001_enums` e o conteúdo acima.

- [ ] **Step 3: Confirmar**

Execute pelo MCP:

```sql
select typname from pg_type
where typname in ('part_slot','anatomy','product_line','brand','spin_direction',
                  'bey_type','rarity','release_type','resistance','inventory_status')
order by typname;
```

Expected: exatamente 10 linhas.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_enums.sql
git commit -m "feat(db): tipos enumerados do catalogo e do inventario"
```

---

### Task 7: Migration `0002_catalog.sql`

**Files:**
- Create: `supabase/migrations/0002_catalog.sql`

- [ ] **Step 1: Escrever a migration**

```sql
create table anatomy_slots (
  anatomy anatomy   not null,
  slot    part_slot not null,
  primary key (anatomy, slot)
);

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
  equivalent_id    uuid references parts(id) on delete restrict,
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

-- Indices para os filtros do catalogo (onda 1)
create index parts_slot_brand_idx     on parts (slot, brand);
create index beyblades_line_idx       on beyblades (line, brand);
create index beyblades_rarity_idx     on beyblades (rarity);
create index beyblade_parts_part_idx  on beyblade_parts (part_id);
```

`beyblade_parts_part_idx` não é otimização prematura: é o índice da consulta inversa "quais beys contêm esta peça", que o spec §4.9 usa no caminho peça → wishlist e a rota `/peca/:id` usa no catálogo.

- [ ] **Step 2: Aplicar via MCP** com nome `0002_catalog`.

- [ ] **Step 3: Confirmar que a FK composta existe**

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'beyblade_parts'::regclass and contype = 'f';
```

Expected: uma linha contendo `FOREIGN KEY (part_id, slot) REFERENCES parts(id, slot)`. Se vier só `(part_id)`, a migration está errada — é essa constraint que impede um bit ocupar o slot de ratchet.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_catalog.sql
git commit -m "feat(db): tabelas de catalogo com FK composta por slot"
```

---

### Task 8: Migration `0003_user_data.sql`

**Files:**
- Create: `supabase/migrations/0003_user_data.sql`

- [ ] **Step 1: Escrever a migration**

`combo_shares.slug` nasce `not null` sem default; a Task 9 acrescenta o default depois de criar `gen_share_slug`.

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
  slug       text    not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create index inventory_profile_idx  on inventory_items (profile_id, status);
create index inventory_beyblade_idx on inventory_items (beyblade_id);
create index combos_profile_idx     on combos (profile_id);
```

`inventory_beyblade_idx` cobre uma FK sem índice que a view `user_parts` (Task 12) usa no join com `beyblade_parts`.

- [ ] **Step 2: Aplicar via MCP** com nome `0003_user_data`.

- [ ] **Step 3: Confirmar a unique que torna posse e desejo exclusivos**

```sql
select pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'inventory_items'::regclass and contype = 'u';
```

Expected: `UNIQUE (profile_id, beyblade_id)` — **sem** `status`. Com `status` na chave, o mesmo bey poderia estar possuído e desejado ao mesmo tempo (spec §4.5).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_user_data.sql
git commit -m "feat(db): tabelas de perfil, inventario, combos e compartilhamento"
```

---

### Task 9: Migration `0004_functions_triggers.sql`

**Files:**
- Create: `supabase/migrations/0004_functions_triggers.sql`

Esta é a task mais delicada do plano. As três armadilhas abaixo estão documentadas no spec §4.6 e foram encontradas em revisão; **não "simplifique" nenhuma delas.**

- [ ] **Step 1: Escrever a migration**

```sql
create extension if not exists pgcrypto with schema extensions;

-- ─── Slug de compartilhamento ────────────────────────────────────────────────
-- 12 caracteres de alfabeto sem ambiguidade visual (sem 0 1 i l o).
-- ~59,5 bits de entropia. Ha vies de modulo leve (256 % 31 = 8, entao os 8
-- primeiros caracteres do alfabeto sao um pouco mais provaveis); irrelevante
-- para um link secreto, mas registrado para nao afirmar uniformidade falsa.
--
-- set search_path = '' + qualificacao de gen_random_bytes sao OBRIGATORIOS:
-- esta funcao e chamada pelo default da coluna a partir de share_combo, que
-- roda com search_path vazio. Sem qualificar, falha com "function
-- gen_random_bytes(integer) does not exist" na primeira tentativa de
-- compartilhar — e de forma intermitente, porque o plano e cacheado por sessao.
create function gen_share_slug() returns text
language sql volatile set search_path = '' as $$
  select string_agg(
    substr('23456789abcdefghjkmnpqrstuvwxyz', (get_byte(b, i) % 31) + 1, 1), ''
  )
  from (select extensions.gen_random_bytes(12) as b) s, generate_series(0, 11) as i;
$$;

alter table combo_shares alter column slug set default gen_share_slug();

-- ─── updated_at generico ─────────────────────────────────────────────────────
create function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger parts_set_updated_at      before update on parts
  for each row execute function set_updated_at();
create trigger beyblades_set_updated_at  before update on beyblades
  for each row execute function set_updated_at();
create trigger inventory_set_updated_at  before update on inventory_items
  for each row execute function set_updated_at();
create trigger combos_set_updated_at     before update on combos
  for each row execute function set_updated_at();

-- ─── Perfil: criacao automatica ──────────────────────────────────────────────
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

-- ─── Perfil: updated_at + imutabilidade no MESMO trigger ─────────────────────
-- Separar as duas responsabilidades seria armadilha: triggers BEFORE disparam
-- em ordem alfabetica, e o de imutabilidade veria o updated_at recem-alterado
-- pelo outro como campo proibido, rejeitando TODA atualizacao.
create function touch_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'campo imutavel em profiles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on profiles
  for each row execute function touch_profile();

-- ─── Validade do combo ───────────────────────────────────────────────────────
-- NEW nao e atribuido em DELETE e OLD nao e atribuido em INSERT. Escrever
-- coalesce(new.combo_id, old.combo_id) parece equivalente e NAO e: a
-- substituicao dos registros ocorre antes da avaliacao do coalesce, e a funcao
-- falha em toda escrita com "record is not assigned yet". Decidir por TG_OP.
-- set search_path = '' e seguro aqui porque todas as tabelas abaixo estao
-- qualificadas com public. e nenhuma funcao fora de pg_catalog e chamada.
-- Sem ele, o linter do Supabase marca function_search_path_mutable.
create function validate_combo_slots() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_combo_id uuid;
begin
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

-- Dois triggers: so o de combo_parts deixaria passar um combo salvo sem peca
-- alguma e um update de anatomy que invalidasse combo ja gravado.
create constraint trigger combo_parts_must_match_anatomy
  after insert or update or delete on combo_parts
  deferrable initially deferred
  for each row execute function validate_combo_slots();

create constraint trigger combo_must_be_complete
  after insert or update on combos
  deferrable initially deferred
  for each row execute function validate_combo_slots();
```

- [ ] **Step 2: Aplicar via MCP** com nome `0004_functions_triggers`.

- [ ] **Step 3: Confirmar que o slug tem o formato prometido**

```sql
select gen_share_slug() as slug, length(gen_share_slug()) as tamanho;
```

Expected: `tamanho` = 12, e o slug só com caracteres de `23456789abcdefghjkmnpqrstuvwxyz`. Se vier menor que 12, o `generate_series` está errado.

**Esta verificação não prova que a função funciona onde ela importa.** Aqui ela roda com `search_path` normal; o caso real é a chamada a partir de `share_combo`, que roda com `search_path` vazio. É por isso que a qualificação `extensions.gen_random_bytes` existe — e é a Task 11 que a exercita de verdade.

- [ ] **Step 4: Confirmar que os dois constraint triggers existem**

```sql
select tgname, tgdeferrable, tginitdeferred
from pg_trigger
where tgname in ('combo_parts_must_match_anatomy', 'combo_must_be_complete');
```

Expected: duas linhas, ambas com `tgdeferrable` e `tginitdeferred` verdadeiros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_functions_triggers.sql
git commit -m "feat(db): funcoes e triggers de integridade"
```

---

### Task 10: Migration `0005_rls.sql`

**Files:**
- Create: `supabase/migrations/0005_rls.sql`

- [ ] **Step 1: Escrever a migration**

```sql
alter table anatomy_slots   enable row level security;
alter table parts           enable row level security;
alter table beyblades       enable row level security;
alter table beyblade_parts  enable row level security;
alter table profiles        enable row level security;
alter table inventory_items enable row level security;
alter table combos          enable row level security;
alter table combo_parts     enable row level security;
alter table combo_shares    enable row level security;

-- ─── Catalogo: leitura publica, escrita nenhuma ──────────────────────────────
-- Sem policy de insert/update/delete: só service_role (que ignora RLS) escreve.
create policy catalogo_leitura_publica on anatomy_slots  for select using (true);
create policy catalogo_leitura_publica on parts          for select using (true);
create policy catalogo_leitura_publica on beyblades      for select using (true);
create policy catalogo_leitura_publica on beyblade_parts for select using (true);

-- ─── Perfil ──────────────────────────────────────────────────────────────────
create policy perfil_leitura_propria on profiles
  for select using (auth.uid() = id);
create policy perfil_escrita_propria on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ─── Inventario ──────────────────────────────────────────────────────────────
create policy inventario_proprio on inventory_items
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ─── Combos: leitura e delete diretos; insert/update so pelas funcoes ────────
-- O trigger de 0004 exige combo e pecas na mesma transacao, e o PostgREST da
-- uma transacao por requisicao. Escrita direta e portanto impossivel: um
-- insert em combos sozinho seria validado sem peca alguma e falharia.
create policy combos_leitura_propria on combos
  for select using (auth.uid() = profile_id);
create policy combos_delete_proprio on combos
  for delete using (auth.uid() = profile_id);

create policy combo_parts_leitura_propria on combo_parts
  for select using (
    exists (select 1 from combos c where c.id = combo_id and c.profile_id = auth.uid())
  );

-- ─── combo_shares: leitura propria, escrita nenhuma ──────────────────────────
create policy shares_leitura_propria on combo_shares
  for select using (
    exists (select 1 from combos c where c.id = combo_id and c.profile_id = auth.uid())
  );
```

- [ ] **Step 2: Aplicar via MCP** com nome `0005_rls`.

- [ ] **Step 3: Confirmar que nenhuma tabela ficou sem RLS**

```sql
select relname from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r' and not relrowsecurity;
```

Expected: **zero linhas**. Qualquer tabela listada aqui está exposta para leitura e escrita por qualquer visitante.

- [ ] **Step 4: Confirmar que o catálogo não tem policy de escrita**

```sql
select tablename, cmd from pg_policies
where schemaname = 'public'
  and tablename in ('parts','beyblades','beyblade_parts','anatomy_slots')
  and cmd <> 'SELECT';
```

Expected: **zero linhas**.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_rls.sql
git commit -m "feat(db): RLS com catalogo publico somente-leitura"
```

---

### Task 11: Migration `0006_rpc.sql`

**Files:**
- Create: `supabase/migrations/0006_rpc.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- ─── Gravacao transacional de combos ─────────────────────────────────────────
-- Combo e pecas precisam da MESMA transacao (trigger de 0004). Uma funcao e a
-- unica forma de conseguir isso via PostgREST.
create function save_combo(
  p_name text, p_anatomy anatomy, p_notes text, p_parts jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_combo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'e necessario estar autenticado';
  end if;

  insert into public.combos (profile_id, name, anatomy, notes)
  values (auth.uid(), p_name, p_anatomy, p_notes)
  returning id into v_combo_id;

  -- ::public.part_slot, nao ::part_slot. Sob search_path = '' o tipo nao e
  -- encontrado e a funcao falha com "type part_slot does not exist" — ou seja,
  -- nenhum combo poderia ser salvo. ::uuid dispensa qualificacao (pg_catalog).
  insert into public.combo_parts (combo_id, part_id, slot)
  select v_combo_id, (e->>'part_id')::uuid, (e->>'slot')::public.part_slot
  from jsonb_array_elements(p_parts) as e;

  -- Forca os constraint triggers diferidos a rodarem aqui, e nao no commit:
  -- o erro volta atrelado a esta chamada em vez de vir opaco pelo PostgREST.
  set constraints all immediate;

  return v_combo_id;
end;
$$;

create function update_combo(
  p_combo_id uuid, p_name text, p_anatomy anatomy, p_notes text, p_parts jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.combos
    where id = p_combo_id and profile_id = auth.uid()
  ) then
    raise exception 'combo inexistente ou de outro usuario';
  end if;

  delete from public.combo_parts where combo_id = p_combo_id;

  update public.combos
  set name = p_name, anatomy = p_anatomy, notes = p_notes
  where id = p_combo_id;

  insert into public.combo_parts (combo_id, part_id, slot)
  select p_combo_id, (e->>'part_id')::uuid, (e->>'slot')::public.part_slot
  from jsonb_array_elements(p_parts) as e;

  set constraints all immediate;
end;
$$;

-- ─── Compartilhamento ────────────────────────────────────────────────────────
-- Upsert, nao insert: a PK e combo_id, e gerar linha nova quebraria a URL ja
-- compartilhada, anulando a razao de is_active existir.
create function share_combo(p_combo_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_slug text;
begin
  if not exists (
    select 1 from public.combos
    where id = p_combo_id and profile_id = auth.uid()
  ) then
    raise exception 'combo inexistente ou de outro usuario';
  end if;

  insert into public.combo_shares (combo_id) values (p_combo_id)
  on conflict (combo_id) do update set is_active = true
  returning slug into v_slug;

  return v_slug;
end;
$$;

create function revoke_combo_share(p_combo_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.combos
    where id = p_combo_id and profile_id = auth.uid()
  ) then
    raise exception 'combo inexistente ou de outro usuario';
  end if;

  update public.combo_shares set is_active = false where combo_id = p_combo_id;
end;
$$;

-- ─── Leitura publica por slug ────────────────────────────────────────────────
-- Nao existe policy de leitura publica em combos: ela permitiria LISTAR todos
-- os combos publicos. O acesso exige conhecer o slug.
create function get_shared_combo(p_slug text)
returns table (
  combo_name text, combo_anatomy anatomy, notes text,
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

-- Revogar de PUBLIC, nao so de anon. O Postgres concede EXECUTE a PUBLIC por
-- padrao no CREATE FUNCTION; revogar apenas de anon deixa o privilegio herdado
-- por PUBLIC intacto, e has_function_privilege('anon', ...) continua TRUE.
-- Depois de revogar de PUBLIC e preciso reconceder a authenticated.
revoke execute on function public.save_combo(text, anatomy, text, jsonb)
  from public, anon;
revoke execute on function public.update_combo(uuid, text, anatomy, text, jsonb)
  from public, anon;
revoke execute on function public.share_combo(uuid)              from public, anon;
revoke execute on function public.revoke_combo_share(uuid)       from public, anon;

grant execute on function public.save_combo(text, anatomy, text, jsonb)
  to authenticated;
grant execute on function public.update_combo(uuid, text, anatomy, text, jsonb)
  to authenticated;
grant execute on function public.share_combo(uuid)               to authenticated;
grant execute on function public.revoke_combo_share(uuid)        to authenticated;

grant execute on function public.get_shared_combo(text) to anon, authenticated;
```

A checagem de `auth.uid()` dentro de `save_combo` já barraria um anônimo, mas depender só dela é mais frágil que negar o acesso — e a verificação do Step 3 só passa com o `revoke` feito de `public`.

- [ ] **Step 2: Aplicar via MCP** com nome `0006_rpc`.

- [ ] **Step 3: Confirmar as permissões**

```sql
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_pode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('save_combo','update_combo','share_combo',
                    'revoke_combo_share','get_shared_combo')
order by p.proname;
```

Expected: `anon_pode` verdadeiro **apenas** para `get_shared_combo`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_rpc.sql
git commit -m "feat(db): funcoes de gravacao transacional e compartilhamento"
```

---

### Task 12: Migration `0007_views.sql` e `0008_storage.sql`

**Files:**
- Create: `supabase/migrations/0007_views.sql`, `supabase/migrations/0008_storage.sql`

- [ ] **Step 1: Escrever `0007_views.sql`**

```sql
-- security_invoker = true e OBRIGATORIO: sem ele a view roda com os
-- privilegios do criador e vaza o inventario de todos os usuarios.
-- O coalesce resolve Hasbro -> canonical; sem ele o laboratorio afirmaria
-- que o usuario nao possui uma peca que possui.
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
```

- [ ] **Step 2: Escrever `0008_storage.sql`**

```sql
insert into storage.buckets (id, name, public)
values ('bey-images', 'bey-images', true)
on conflict (id) do nothing;

create policy "imagens leitura publica" on storage.objects
  for select using (bucket_id = 'bey-images');
```

Sem policy de escrita: só a `service_role` do script de seed envia imagens.

Se vier `must be owner of table objects`, criar policy em `storage.objects` exige privilégio de `supabase_storage_admin`. Nesse caso crie o bucket e a policy pelo painel (*Storage → New bucket → Public*) e registre no arquivo que a parte de policy foi aplicada manualmente. Note que, com `public = true`, a leitura anônima já funciona pelo endpoint público — a policy é redundante, ainda que inofensiva.

- [ ] **Step 3: Aplicar as duas via MCP** (`0007_views`, `0008_storage`).

- [ ] **Step 4: Confirmar `security_invoker`**

```sql
select c.relname, c.reloptions
from pg_class c
where c.relname = 'user_parts';
```

Expected: `reloptions` contém `security_invoker=true`. Se vier nulo, a view está vazando inventário — **corrija antes de seguir**.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0007_views.sql supabase/migrations/0008_storage.sql
git commit -m "feat(db): view de pecas do usuario e bucket de imagens"
```

---

### Task 13: `data/anatomies.json` e sincronização

**Files:**
- Create: `data/anatomies.json`, `scripts/sync-anatomies.ts`

- [ ] **Step 1: Criar `data/anatomies.json`** (spec §5.1)

```json
{
  "basic":         ["blade", "ratchet", "bit"],
  "unique":        ["blade", "assist_blade", "ratchet", "bit"],
  "custom":        ["lock_chip", "main_blade", "assist_blade", "ratchet", "bit"],
  "custom_expand": ["lock_chip", "metal_blade", "over_blade", "assist_blade", "ratchet", "bit"]
}
```

- [ ] **Step 2: Criar `scripts/sync-anatomies.ts`**

Esta é a **única** tabela sincronizada destrutivamente (spec §4.3): uma linha obsoleta aqui faria o banco aceitar combos com slot que a anatomia não tem mais.

```ts
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !serviceKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente");
}

const anatomies = JSON.parse(
  readFileSync(new URL("../data/anatomies.json", import.meta.url), "utf8"),
) as Record<string, string[]>;

const rows = Object.entries(anatomies).flatMap(([anatomy, slots]) =>
  slots.map((slot) => ({ anatomy, slot })),
);

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Destrutivo por design: apaga tudo e reinsere o arquivo inteiro.
// NAO use o idioma .neq(col, "valor_impossivel") aqui: `anatomy` e coluna de
// enum, e o Postgres tenta coagir o literal ao tipo, falhando com
// "invalid input value for enum anatomy". O script morreria antes do insert e
// deixaria a tabela VAZIA — sem fonte de verdade para validate_combo_slots.
const { error: delErr } = await db.from("anatomy_slots").delete().not("anatomy", "is", null);
if (delErr) throw delErr;

const { error: insErr } = await db.from("anatomy_slots").insert(rows);
if (insErr) throw insErr;

console.log(`anatomy_slots sincronizada: ${rows.length} linhas`);
```

**Atenção:** este script usa a `service_role` key. Ela vem do ambiente e **nunca** de arquivo versionado. Rode como `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run sync:anatomies`.

- [ ] **Step 3: Rodar a sincronização**

Run: `npm run sync:anatomies` (com as duas variáveis no ambiente)
Expected: `anatomy_slots sincronizada: 18 linhas` (3+4+5+6).

- [ ] **Step 4: Confirmar no banco**

```sql
select anatomy, count(*) from anatomy_slots group by anatomy order by anatomy;
```

Expected: `basic` 3, `custom` 5, `custom_expand` 6, `unique` 4.

- [ ] **Step 5: Criar `SUPABASE_ADMIN.md` com o aviso operacional**

O spec §4.3 exige que este cuidado esteja registrado, e ele nasce junto com a sincronização destrutiva. Crie o arquivo na raiz com, no mínimo:

```markdown
# Administração SQL — Blade X Lab

Comandos executados no SQL Editor do painel do Supabase.
Projeto: `gbcpfsczjivtwkyheihu` (BLADEXLAB).

## Alterar uma anatomia já em uso — LEIA ANTES

Os triggers de validade de combo rodam **apenas em escrita, nunca em repouso**.
Remover um slot de uma anatomia em `data/anatomies.json` e rodar
`npm run sync:anatomies` deixa os combos já salvos daquela anatomia inválidos
e **silenciosamente imutáveis**: não podem mais ser sequer renomeados, porque
`update_combo` revalida o conjunto inteiro de slots.

Alterar uma anatomia em uso exige migrar os combos afetados na mesma transação.

## Aposentar uma peça

Todas as FKs do catálogo são `on delete restrict`. Apagar peça referenciada
falha de propósito — para não destruir combos de usuários. Migre as referências
primeiro.
```

As demais seções (diagnóstico, atendimento a usuário, LGPD), a exemplo do `SUPABASE_ADMIN.md` do Trocação, entram nas ondas seguintes, quando houver usuários.

- [ ] **Step 6: Commit**

```bash
git add data/anatomies.json scripts/sync-anatomies.ts SUPABASE_ADMIN.md
git commit -m "feat(db): anatomias como dado versionado com sync destrutivo"
```

---

### Task 14: Verificações executáveis do schema

**Files:**
- Create: `supabase/tests/schema_checks.sql`

O motor da onda 3 terá testes em Vitest. As regras deste chunk, porém, vivem no Postgres — e foram justamente as que quebraram em revisão. Elas merecem verificação executável.

- [ ] **Step 1: Escrever `supabase/tests/schema_checks.sql`**

```sql
-- Executar pelo MCP. Cada bloco levanta excecao se a regra nao valer.
-- Roda inteiro dentro de uma transacao que termina em rollback: nao suja dados.
begin;

-- 1. Combo incompleto deve ser rejeitado ------------------------------------
do $$
declare
  v_user uuid := gen_random_uuid();
  v_combo uuid;
  v_blade uuid;
begin
  insert into auth.users (id, email) values (v_user, 'teste@exemplo.com');
  -- o trigger handle_new_user ja criou o profile

  insert into parts (slot, name, line, source_url)
  values ('blade', 'Teste Blade', 'BX', 'http://exemplo') returning id into v_blade;

  begin
    insert into combos (profile_id, name, anatomy)
    values (v_user, 'incompleto', 'basic') returning id into v_combo;
    insert into combo_parts (combo_id, part_id, slot) values (v_combo, v_blade, 'blade');

    -- SET CONSTRAINTS ALL IMMEDIATE e IMPRESCINDIVEL aqui.
    -- Constraint triggers DEFERRABLE INITIALLY DEFERRED so disparam no commit
    -- da transacao real. Um bloco BEGIN...EXCEPTION do PL/pgSQL e apenas uma
    -- subtransacao: ao liberar o savepoint, os eventos pendentes sao
    -- TRANSFERIDOS para a transacao pai, nao executados. Sem esta linha o
    -- raise abaixo seria sempre alcancado e o teste REPROVARIA um schema
    -- correto, abortando a suite antes dos checks 2 a 5.
    set constraints all immediate;

    raise exception 'FALHA: combo incompleto foi aceito';
  exception
    when others then
      if sqlerrm like 'FALHA:%' then raise; end if;
  end;
end $$;

-- 2. gen_share_slug tem 12 caracteres do alfabeto esperado -------------------
do $$
declare s text := gen_share_slug();
begin
  if length(s) <> 12 then
    raise exception 'FALHA: slug com % caracteres, esperado 12', length(s);
  end if;
  if s !~ '^[23456789abcdefghjkmnpqrstuvwxyz]{12}$' then
    raise exception 'FALHA: slug fora do alfabeto: %', s;
  end if;
end $$;

-- 3. profiles rejeita alteracao de campo imutavel ----------------------------
do $$
declare
  v_user uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_user, 'imutavel@exemplo.com');
  begin
    update profiles set created_at = now() - interval '1 year' where id = v_user;
    raise exception 'FALHA: created_at pode ser alterado';
  exception
    when others then
      if sqlerrm like 'FALHA:%' then raise; end if;
  end;
  -- mas o nome muda normalmente
  update profiles set display_name = 'Novo Nome' where id = v_user;
end $$;

-- 4. FK composta impede peca em slot errado ----------------------------------
do $$
declare
  v_bit uuid;
  v_bey uuid;
begin
  insert into parts (slot, name, line, source_url)
  values ('bit', 'Teste Bit', 'BX', 'http://exemplo') returning id into v_bit;

  insert into beyblades (release_code, name, line, anatomy, release_type, source_url)
  values ('BX-TEST', 'Teste', 'BX', 'basic', 'booster', 'http://exemplo')
  returning id into v_bey;

  begin
    insert into beyblade_parts (beyblade_id, part_id, slot)
    values (v_bey, v_bit, 'ratchet');   -- bit no slot de ratchet
    raise exception 'FALHA: FK composta nao impediu peca em slot errado';
  exception
    when foreign_key_violation then null;
    when others then if sqlerrm like 'FALHA:%' then raise; end if;
  end;
end $$;

-- 5. user_parts resolve equivalencia Hasbro ---------------------------------
do $$
declare
  v_user uuid := gen_random_uuid();
  v_tt uuid; v_hasbro uuid; v_bey uuid; v_qtd int;
begin
  insert into auth.users (id, email) values (v_user, 'hasbro@exemplo.com');

  insert into parts (slot, name, line, brand, source_url)
  values ('blade', 'Dran Sword', 'BX', 'takara_tomy', 'http://exemplo')
  returning id into v_tt;

  insert into parts (slot, name, line, brand, equivalent_id, source_url)
  values ('blade', 'Dran Sword HAS', 'BX', 'hasbro', v_tt, 'http://exemplo')
  returning id into v_hasbro;

  insert into beyblades (release_code, name, line, anatomy, brand, release_type, source_url)
  values ('HAS-1', 'Bey Hasbro', 'BX', 'basic', 'hasbro', 'booster', 'http://exemplo')
  returning id into v_bey;

  insert into beyblade_parts (beyblade_id, part_id, slot) values (v_bey, v_hasbro, 'blade');
  insert into inventory_items (profile_id, beyblade_id, quantity) values (v_user, v_bey, 2);

  select quantity into v_qtd from user_parts
  where profile_id = v_user and part_id = v_tt;

  if v_qtd is distinct from 2 then
    raise exception 'FALHA: user_parts nao resolveu Hasbro para canonical (v_qtd=%)', v_qtd;
  end if;
end $$;

rollback;
```

O caso 5 é o mais valioso da suíte: é o bug que a revisão do spec encontrou e que, em produção, apareceria como "o app diz que eu não tenho uma peça que eu tenho".

- [ ] **Step 2: Executar pelo MCP**

Cole o arquivo inteiro na ferramenta de executar SQL do MCP.
Expected: executa até o `rollback` **sem nenhuma exceção**. Qualquer mensagem começando com `FALHA:` indica regra quebrada — corrija a migration correspondente e reaplique.

Se a ferramenta do MCP já abrir transação própria, o `begin;` inicial produz `WARNING: there is already a transaction in progress`. É inofensivo — não confunda com falha.

Se o ambiente do MCP não permitir escrita em `auth.users`, execute só os blocos 2 e 4 (que não precisam de usuário) e registre os demais como verificação a rodar quando houver acesso — **não os apague**.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/schema_checks.sql
git commit -m "test(db): verificacoes executaveis das regras de integridade"
```

---

**Fim do Chunk 2.** O banco está completo e verificado, mas nada no frontend o consome ainda.

---

## Chunk 3: Integração e publicação

### Task 15: Página de fumaça lendo o banco

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/types/database.ts`, `src/hooks/useAnatomies.ts`

Prova o caminho inteiro: navegador → `supabase-js` → RLS → tabela pública. Se as anatomias aparecem sem login, a policy de leitura pública funciona.

- [ ] **Step 1: Gerar os tipos do banco e ligá-los ao cliente**

Use a ferramenta de geração de tipos do MCP do Supabase e salve a saída em `src/types/database.ts`. Se o MCP não oferecer essa função, escreva à mão apenas os tipos usados nesta task e registre a geração completa como pendência da onda 1 — não invente o arquivo inteiro.

Em seguida **ligue o generic em `src/lib/supabase.ts`**, senão o arquivo gerado fica morto e toda linha consultada é `any`:

```ts
import type { Database } from "../types/database.ts";
// ...
export const supabase = createClient<Database>(url, anonKey, { /* ... */ });
```

- [ ] **Step 2: Criar `src/hooks/useAnatomies.ts`**

```ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";

export type AnatomySlots = Record<string, string[]>;

export function useAnatomies() {
  const [anatomies, setAnatomies] = useState<AnatomySlots>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    supabase
      .from("anatomy_slots")
      .select("anatomy, slot")
      .order("anatomy")
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          setError(error.message);
        } else {
          const agrupado: AnatomySlots = {};
          for (const row of data ?? []) {
            (agrupado[row.anatomy] ??= []).push(row.slot);
          }
          setAnatomies(agrupado);
        }
        setLoading(false);
      });

    return () => { cancelado = true; };
  }, []);

  return { anatomies, error, loading };
}
```

O `cancelado` evita atualizar estado depois da desmontagem — sob `StrictMode` do React 19, o efeito roda duas vezes em desenvolvimento e sem isso aparece um aviso confuso.

- [ ] **Step 3: Consumir em `src/App.tsx`**

```tsx
import { T } from "./theme.ts";
import { useAnatomies } from "./hooks/useAnatomies.ts";

export default function App() {
  const { anatomies, error, loading } = useAnatomies();

  return (
    <div style={{ minHeight: "100dvh", background: T.bgPage, color: T.textPrimary,
                  fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1 style={{ margin: 0, color: T.accent }}>Blade X Lab</h1>
      <p style={{ color: T.textSecondary }}>Onda 0 — fundação</p>

      {loading && <p style={{ color: T.textMuted }}>Carregando…</p>}
      {error && <p style={{ color: T.danger }}>Erro: {error}</p>}

      {Object.entries(anatomies).map(([anatomy, slots]) => (
        <div key={anatomy} style={{ background: T.bgCard, border: `1px solid ${T.border}`,
                                    borderRadius: 8, padding: 16, marginTop: 12 }}>
          <strong>{anatomy}</strong>
          <div style={{ color: T.textSecondary, fontSize: 14 }}>{slots.join(" · ")}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e verificar no navegador**

Run: `npm run dev`
Expected: em `http://localhost:5173`, quatro cartões — `basic`, `unique`, `custom`, `custom_expand` — com os slots corretos, **sem nenhum login**.

Se aparecer vazio sem erro, a policy de leitura pública não foi aplicada (revise a Task 10). Se aparecer erro de rede, revise o `.env`.

- [ ] **Step 5: Confirmar que os testes seguem passando**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/database.ts src/hooks/useAnatomies.ts src/App.tsx
git commit -m "feat: pagina de fumaca lendo anatomias do Supabase"
```

---

### Task 16: Publicar na Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Criar `vercel.json`**

Igual ao do Trocação — SPA precisa que toda rota caia no `index.html`, senão `/lab` dá 404 ao recarregar:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 2: Publicar o repositório**

Crie o repositório remoto e faça push da branch. Em seguida, importe o projeto na Vercel (framework detectado: Vite; build `npm run build`; saída `dist`).

- [ ] **Step 3: Configurar as variáveis na Vercel**

Em *Settings → Environment Variables*, defina para *Production*, *Preview* e *Development*:

- `VITE_SUPABASE_URL` = `https://gbcpfsczjivtwkyheihu.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = a anon key do painel

**Não** defina `SUPABASE_SERVICE_ROLE_KEY` na Vercel. Ela só existe na máquina que roda os scripts de seed; na Vercel ela não teria uso e seria uma chave de administrador a mais exposta.

- [ ] **Step 4: Verificar o deploy**

Abra a URL de produção.
Expected: os quatro cartões de anatomia, iguais aos do ambiente local.

Se a página vier em branco, abra o console: `readSupabaseEnv` (Task 2) nomeia a variável que falta. O build em si passa mesmo sem as variáveis — veja a nota da Task 5, Step 4.

- [ ] **Step 5: Verificar a instalação como PWA**

No Chrome, o ícone de instalar deve aparecer na barra de endereços. Instale e confirme que abre em janela própria.

- [ ] **Step 6: Commit**

```bash
git add vercel.json
git commit -m "chore: configuracao de deploy na Vercel"
```

---

## Critério de conclusão da Onda 0

- [ ] `npm run build` e `npm test` passam.
- [ ] As oito migrations estão aplicadas e versionadas em `supabase/migrations/`.
- [ ] `schema_checks.sql` roda sem nenhuma linha `FALHA:`.
- [ ] Nenhuma tabela de `public` sem RLS.
- [ ] O catálogo não tem policy de escrita.
- [ ] `user_parts` tem `security_invoker=true`.
- [ ] Só `get_shared_combo` é executável por `anon`.
- [ ] A URL de produção mostra as quatro anatomias sem login.
- [ ] O app instala como PWA.
- [ ] Nenhum segredo versionado: `git log -p | grep -i "service_role"` não retorna chave alguma.

## O que fica para a Onda 1

- Ícones PNG do manifest, se não gerados na Task 4.
- Geração completa de `src/types/database.ts`, se o MCP não a oferecer.
- `react-router-dom` está instalado mas ainda não usado — as rotas de spec §3.2 entram com as telas de catálogo.
