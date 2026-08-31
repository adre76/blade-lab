# Onda 1 — Catálogo — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o piloto de 11 beys num catálogo completo e navegável de Beyblade X — dados curados de toda a linha Takara Tomy, imagens servidas pelo Storage, e as telas de detalhe de bey e de peça — tudo público, sem login.

**Architecture:** Os dados vivem como JSON versionado em `data/`, validados por Zod e enviados ao Supabase por um script idempotente. O frontend ganha rotas reais (`react-router`, já instalado e ainda não usado) e duas telas novas de detalhe. A listagem, o card e o agrupamento por composição já existem e vêm do piloto.

**Tech Stack:** o mesmo da Onda 0, mais `zod` (validação do seed) e `sharp` (otimização de imagens). `react-router-dom` já está instalado.

**Spec:** [`docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`](../specs/2026-08-31-blade-x-lab-design.md)
**Onda anterior:** [`2026-08-31-onda-0-fundacao.md`](2026-08-31-onda-0-fundacao.md)

---

## Estado da execução — atualizado em 2026-08-31

| Bloco | Estado |
|---|---|
| **Chunk 1** — infraestrutura do seed | ✅ Feito, executado e idempotência provada |
| **Chunk 2** — curadoria BX + UX | ✅ **146 peças e 37 beys no ar** |
| **Chunk 3** — rotas e telas de detalhe | ✅ Feito |
| **Chunk 3** — imagens | ✅ 37/37 beys, 108/146 peças |
| **Chunk 3** — prefetch offline (Task 12) | ⬜ Único item pendente |

### Números do catálogo em produção

| | |
|---|---|
| Peças | 146 — 59 lâminas, 35 ratchets, 52 bits |
| Beyblades | 37 — 21 BX, 16 UX |
| Composições exibidas | 35 (dois pares agrupados) |
| Ligações bey↔peça | 111 = 37 × 3 |
| Beys sem peça / anatomia divergente | 0 / 0 |
| Imagens | 37 beys, 108 peças |

**Feito e verificado:**

- `src/lib/seed/schema.ts` — validação Zod, 20 testes
- `src/lib/seed/carregar.ts` — carregamento compartilhado entre seed e testes
- `src/lib/seed/integridade.test.ts` — 9 testes sobre os arquivos, sem credencial
- `scripts/seed.ts` — escrito e compilando
- Rotas `/`, `/bey/:id`, `/peca/:id`, `/creditos`; busca e filtro na querystring
- `DetalheBey` com contribuição por peça e "também vendido como"
- `DetalhePeca` com "onde conseguir esta peça" (a busca inversa do spec §4.9)
- `src/components/rotulos.ts` centralizando a tradução para pt-BR

**Seed executado e idempotência provada.** Rodado duas vezes seguidas; o banco
permaneceu em `25 peças, 11 beys, 33 ligações, 0 beys sem peça`. As credenciais
ficam em `.env.seed` (ignorado pelo git), carregado por `--env-file-if-exists`.

**Ao executar, apareceu o mesmo defeito da Onda 0, do outro lado.** A migration
`0010` concedeu grants a `anon` e `authenticated` e esqueceu `service_role`; o
seed falhava com `42501` em toda escrita, mesmo com a chave correta. Corrigido
na `0012`, que também define *default privileges* para que tabelas futuras
herdem o grant.

A lição — **`service_role` ignora RLS, mas não ignora GRANT** — está registrada
em `SUPABASE_ADMIN.md` com a consulta que confere os três roles de uma vez. É a
segunda vez que essa confusão derruba o projeto.

**Descoberta durante a execução:** o teste de integridade pegou de imediato uma
divergência real — os JSON do piloto declaram a fonte uma vez por arquivo
(`_fonte`), mas o schema exige `source_url` por registro. Em vez de repetir a
URL em 150 linhas, o carregador aplica a fonte do arquivo como padrão e o
registro pode sobrescrever. O que chega ao banco continua tendo fonte linha a
linha.

---

## O que a Onda 1 já herda pronto

O piloto (feito ao fim da Onda 0) adiantou boa parte do que este plano previa:

| Já existe | Onde |
|---|---|
| Listagem com busca, filtro por natureza e contagem | `src/components/Catalogo.tsx` |
| Card com peças, atributos, marca e **área de imagem funcionando** | `src/components/BeyCard.tsx` |
| Agrupamento por composição (BX-03 + BX-05 num card) | `src/hooks/useCatalog.ts` |
| Montagem de URL do Storage a partir de `image_path` | `src/lib/imagens.ts` |
| Formato do JSON de dados, validado pelo usuário | `data/parts/*.json`, `data/beyblades/bx.json` |
| Schema, RLS, grants, bucket `bey-images` | Onda 0 |

**Consequência prática:** esta onda é sobretudo **curadoria de dados** e **duas telas novas**. O trabalho de apresentação foi antecipado e aprovado com 9 cards na tela, em vez de 150.

## Restrições globais

- Herdadas da Onda 0 (TypeScript, sem framework CSS, valores em inglês, catálogo somente-leitura pela API).
- **Todo registro tem `source_url`.** Sem exceção. É o que sustenta a página de créditos e a honestidade sobre a procedência.
- **Nada de dado inventado.** Campo sem confirmação fica nulo. Uma data errada é pior que uma data ausente, porque parece verdade.
- **Derivações são registradas em `notes`**, como já foi feito com o `burst_resistance` dos bits.
- `spin_direction` só na lâmina principal; `height_mm` só em ratchet; `dash_performance` só em bit.

---

## Chunk 1: Infraestrutura do seed

O piloto entrou no banco por SQL gerado à mão. Isso não escala para ~300 registros nem sobrevive a correções. Antes de curar em volume, o caminho `data/*.json → banco` precisa ser um script confiável e testado.

### Task 1: Schema de validação dos dados

**Files:**
- Create: `src/lib/seed/schema.ts`
- Create: `src/lib/seed/schema.test.ts`

**Interfaces:** exporta `PartSchema`, `BeybladeSchema` e os tipos inferidos, consumidos pelo script de seed (Task 2) e pelos testes de integridade (Task 3).

- [ ] **Step 1: Instalar o Zod**

```bash
npm install zod
```

- [ ] **Step 2: Escrever os testes que falham**

`src/lib/seed/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PartSchema, BeybladeSchema } from "./schema.ts";

describe("PartSchema", () => {
  const valida = {
    slot: "blade", name: "Dran Sword", line: "BX",
    attack: 55, defense: 25, stamina: 20,
    weight_g: 34.9, spin_direction: "right", part_type: "attack",
    source_url: "https://exemplo",
  };

  it("aceita uma peça válida", () => {
    expect(() => PartSchema.parse(valida)).not.toThrow();
  });

  it("recusa peça sem source_url", () => {
    const { source_url, ...sem } = valida;
    expect(() => PartSchema.parse(sem)).toThrow();
  });

  it("recusa slot fora do enum", () => {
    expect(() => PartSchema.parse({ ...valida, slot: "propeller" })).toThrow();
  });

  it("recusa atributo negativo", () => {
    expect(() => PartSchema.parse({ ...valida, attack: -1 })).toThrow();
  });

  it("recusa spin_direction fora da lâmina principal", () => {
    expect(() =>
      PartSchema.parse({ ...valida, slot: "ratchet", spin_direction: "right" }),
    ).toThrow(/spin_direction/);
  });

  it("recusa height_mm fora de ratchet", () => {
    expect(() => PartSchema.parse({ ...valida, height_mm: 60 })).toThrow(/height_mm/);
  });

  it("recusa dash_performance fora de bit", () => {
    expect(() =>
      PartSchema.parse({ ...valida, dash_performance: "high" }),
    ).toThrow(/dash_performance/);
  });
});

describe("BeybladeSchema", () => {
  const valido = {
    release_code: "BX-01", name: "Dran Sword 3-60F", line: "BX",
    anatomy: "basic", release_type: "starter", release_date: "2023-07-15",
    rarity: "common", bey_type: "attack",
    parts: { blade: "Dran Sword", ratchet: "3-60", bit: "Flat" },
    source_url: "https://exemplo",
  };

  it("aceita um bey válido", () => {
    expect(() => BeybladeSchema.parse(valido)).not.toThrow();
  });

  it("aceita release_date nula", () => {
    expect(() => BeybladeSchema.parse({ ...valido, release_date: null })).not.toThrow();
  });

  it("recusa data em formato livre", () => {
    expect(() => BeybladeSchema.parse({ ...valido, release_date: "julho/2023" })).toThrow();
  });

  it("recusa conjunto de slots que não bate com a anatomia", () => {
    expect(() =>
      BeybladeSchema.parse({ ...valido, parts: { blade: "X", ratchet: "Y" } }),
    ).toThrow(/anatomia/);
  });

  it("recusa slot que não pertence à anatomia", () => {
    expect(() =>
      BeybladeSchema.parse({
        ...valido,
        parts: { blade: "X", ratchet: "Y", bit: "Z", lock_chip: "W" },
      }),
    ).toThrow(/anatomia/);
  });
});
```

As três últimas validações de `PartSchema` existem porque são exatamente as
colunas restritas a slot do spec §4.4 — as que nenhuma constraint do banco
protege e que só o teste faz valer.

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './schema.ts'`.

- [ ] **Step 4: Escrever `src/lib/seed/schema.ts`**

```ts
import { z } from "zod";
import anatomias from "../../../data/anatomies.json" with { type: "json" };

export const SLOTS = [
  "lock_chip", "main_blade", "metal_blade", "over_blade",
  "assist_blade", "blade", "ratchet", "bit",
] as const;

const LAMINAS_PRINCIPAIS = ["blade", "main_blade", "metal_blade"] as const;

const Slot = z.enum(SLOTS);
const Linha = z.enum(["BX", "UX", "CX"]);
const Anatomia = z.enum(["basic", "unique", "custom", "custom_expand"]);
const Marca = z.enum(["takara_tomy", "hasbro"]);
const Resistencia = z.enum(["very_low", "low", "medium", "high", "very_high"]);
const Natureza = z.enum(["attack", "defense", "stamina", "balance"]);
const Giro = z.enum(["right", "left", "dual"]);
const Raridade = z.enum(["common", "uncommon", "rare", "very_rare", "exclusive"]);
const TipoLancamento = z.enum([
  "starter", "booster", "random_booster", "deck_set",
  "custom_set", "limited", "event_exclusive", "other",
]);

const Atributo = z.number().int().min(0).max(200);

export const PartSchema = z
  .object({
    slot: Slot,
    brand: Marca.default("takara_tomy"),
    name: z.string().min(1),
    code: z.string().min(1).nullish(),
    line: Linha,
    attack: Atributo,
    defense: Atributo,
    stamina: Atributo,
    weight_g: z.number().positive().max(100).nullish(),
    height_mm: z.number().positive().max(200).nullish(),
    contact_points: z.number().int().positive().max(20).nullish(),
    burst_resistance: Resistencia.nullish(),
    dash_performance: Resistencia.nullish(),
    spin_direction: Giro.nullish(),
    part_type: Natureza.nullish(),
    equivalent_name: z.string().nullish(),   // resolvido para id no seed
    image_path: z.string().nullish(),
    source_url: z.string().url(),
    notes: z.string().nullish(),
  })
  .superRefine((p, ctx) => {
    const erro = (campo: string, msg: string) =>
      ctx.addIssue({ code: "custom", path: [campo], message: `${campo}: ${msg}` });

    if (p.spin_direction != null && !LAMINAS_PRINCIPAIS.includes(p.slot as never)) {
      erro("spin_direction", "só é preenchida na lâmina principal (spec §4.4)");
    }
    if (p.height_mm != null && p.slot !== "ratchet") {
      erro("height_mm", "só existe em ratchet");
    }
    if (p.contact_points != null && p.slot !== "ratchet") {
      erro("contact_points", "só existe em ratchet");
    }
    if (p.dash_performance != null && p.slot !== "bit") {
      erro("dash_performance", "só existe em bit");
    }
  });

export const BeybladeSchema = z
  .object({
    release_code: z.string().min(1),
    name: z.string().min(1),
    line: Linha,
    anatomy: Anatomia,
    brand: Marca.default("takara_tomy"),
    release_type: TipoLancamento,
    release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    rarity: Raridade,
    bey_type: Natureza.nullish(),
    equivalent_code: z.string().nullish(),
    image_path: z.string().nullish(),
    parts: z.record(Slot, z.string().min(1)),
    source_url: z.string().url(),
    notes: z.string().nullish(),
  })
  .superRefine((b, ctx) => {
    const esperados = [...(anatomias as Record<string, string[]>)[b.anatomy] ?? []].sort();
    const informados = Object.keys(b.parts).sort();
    if (JSON.stringify(esperados) !== JSON.stringify(informados)) {
      ctx.addIssue({
        code: "custom",
        path: ["parts"],
        message:
          `slots não batem com a anatomia '${b.anatomy}': ` +
          `esperado [${esperados}], recebido [${informados}]`,
      });
    }
  });

export type Part = z.infer<typeof PartSchema>;
export type Beyblade = z.infer<typeof BeybladeSchema>;
```

`data/anatomies.json` é importado aqui de propósito: é a mesma fonte de verdade
que popula `anatomy_slots` no banco (spec §4.3). Assim a validação do arquivo e a
do banco não podem divergir.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS — 12 novos testes, mais os 3 de `env`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/seed/schema.ts src/lib/seed/schema.test.ts
git commit -m "test: schema Zod dos dados de seed"
```

---

### Task 2: Script de seed idempotente

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (script `seed`)

**Interfaces:** lê `data/**`, valida com os schemas da Task 1, escreve no Supabase com a `service_role` key vinda do ambiente.

- [ ] **Step 1: Escrever `scripts/seed.ts`**

```ts
/**
 * Importa data/ para o Supabase.
 *
 * IDEMPOTENTE: reexecutar não duplica nem apaga. Faz upsert por chave natural
 * — (brand, slot, name) para peças, (brand, release_code, name) para beys.
 *
 * EXCEÇÃO: anatomy_slots é sincronizada destrutivamente por
 * scripts/sync-anatomies.ts (spec §4.3). Este script não a toca.
 *
 * Uso (a service_role key vem do ambiente, NUNCA de arquivo versionado):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 */
import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PartSchema, BeybladeSchema } from "../src/lib/seed/schema.ts";

const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !serviceKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente");
}

const raiz = new URL("../data/", import.meta.url);

function lerPasta(sub: string, chave: string): unknown[] {
  const dir = new URL(`${sub}/`, raiz);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const conteudo = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
      return (conteudo[chave] ?? []) as unknown[];
    });
}

// ─── Validação antes de qualquer escrita ─────────────────────────────────────
// Falhar aqui é barato; falhar no meio da escrita deixa o banco pela metade.
const partesBrutas = lerPasta("parts", "parts");
const beysBrutos = lerPasta("beyblades", "beyblades");

const erros: string[] = [];
const partes = partesBrutas.flatMap((p, i) => {
  const r = PartSchema.safeParse(p);
  if (!r.success) {
    erros.push(`peça #${i}: ${r.error.issues.map((e) => e.message).join("; ")}`);
    return [];
  }
  return [r.data];
});
const beys = beysBrutos.flatMap((b, i) => {
  const r = BeybladeSchema.safeParse(b);
  if (!r.success) {
    erros.push(`bey #${i}: ${r.error.issues.map((e) => e.message).join("; ")}`);
    return [];
  }
  return [r.data];
});

if (erros.length > 0) {
  console.error(`${erros.length} registro(s) inválido(s):\n` + erros.join("\n"));
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// ─── Peças ───────────────────────────────────────────────────────────────────
const { error: errPartes } = await db.from("parts").upsert(
  partes.map(({ equivalent_name: _omitido, ...p }) => p),
  { onConflict: "brand,slot,name" },
);
if (errPartes) throw errPartes;

// ─── Beyblades ───────────────────────────────────────────────────────────────
const { error: errBeys } = await db.from("beyblades").upsert(
  beys.map(({ parts: _p, equivalent_code: _e, ...b }) => b),
  { onConflict: "brand,release_code,name" },
);
if (errBeys) throw errBeys;

// ─── Ligações bey <-> peça ───────────────────────────────────────────────────
// Resolvidas por nome, depois que os dois lados existem.
const { data: idsPartes } = await db.from("parts").select("id, brand, slot, name");
const { data: idsBeys } = await db.from("beyblades").select("id, brand, release_code, name");

const chavePeca = (brand: string, slot: string, name: string) => `${brand}|${slot}|${name}`;
const mapaPecas = new Map((idsPartes ?? []).map((p) => [chavePeca(p.brand, p.slot, p.name), p.id]));
const mapaBeys = new Map(
  (idsBeys ?? []).map((b) => [`${b.brand}|${b.release_code}|${b.name}`, b.id]),
);

const ligacoes: { beyblade_id: string; part_id: string; slot: string }[] = [];
const orfas: string[] = [];
for (const b of beys) {
  const beyId = mapaBeys.get(`${b.brand}|${b.release_code}|${b.name}`);
  if (!beyId) { orfas.push(`bey não encontrado: ${b.release_code}`); continue; }
  for (const [slot, nomePeca] of Object.entries(b.parts)) {
    const partId = mapaPecas.get(chavePeca(b.brand, slot, nomePeca));
    if (!partId) {
      orfas.push(`${b.release_code}: peça '${nomePeca}' (${slot}) não existe em data/parts`);
      continue;
    }
    ligacoes.push({ beyblade_id: beyId, part_id: partId, slot });
  }
}

if (orfas.length > 0) {
  console.error(`${orfas.length} referência(s) órfã(s):\n` + orfas.join("\n"));
  process.exit(1);
}

const { error: errLig } = await db
  .from("beyblade_parts")
  .upsert(ligacoes, { onConflict: "beyblade_id,slot" });
if (errLig) throw errLig;

// ─── Equivalências Hasbro -> Takara Tomy (onda 6) ────────────────────────────
// Roda depois de tudo existir. Sem efeito enquanto não houver registros Hasbro.
for (const p of partes.filter((x) => x.equivalent_name)) {
  const alvo = mapaPecas.get(chavePeca("takara_tomy", p.slot, p.equivalent_name!));
  if (!alvo) { console.warn(`equivalente não encontrado para ${p.name}`); continue; }
  await db.from("parts").update({ equivalent_id: alvo })
    .match({ brand: p.brand, slot: p.slot, name: p.name });
}

console.log(
  `seed concluído: ${partes.length} peças, ${beys.length} beys, ${ligacoes.length} ligações`,
);
```

- [ ] **Step 2: Registrar o script no `package.json`**

```json
"seed": "tsx scripts/seed.ts",
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 4: Rodar contra o banco, com os dados do piloto**

Run: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`
Expected: `seed concluído: 25 peças, 11 beys, 33 ligações`

**Esta é a prova de idempotência:** os dados já estão no banco desde o piloto.
O script deve reprocessá-los sem duplicar nada. Confirme com:

```sql
select (select count(*) from parts) as pecas,
       (select count(*) from beyblades) as beys,
       (select count(*) from beyblade_parts) as ligacoes;
```

Expected: exatamente `25, 11, 33` — os mesmos números de antes.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts package.json
git commit -m "feat: script de seed idempotente com validacao"
```

---

### Task 3: Testes de integridade dos dados

**Files:**
- Create: `src/lib/seed/integridade.test.ts`

Estes testes rodam sobre os **arquivos**, não sobre o banco — assim quebram no
`npm test`, antes de qualquer escrita, e não exigem credencial.

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { PartSchema, BeybladeSchema } from "./schema.ts";
import anatomias from "../../../data/anatomies.json" with { type: "json" };

const raiz = new URL("../../../data/", import.meta.url);
const ler = (sub: string, chave: string) =>
  readdirSync(new URL(`${sub}/`, raiz))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) =>
      JSON.parse(readFileSync(new URL(`${sub}/${f}`, raiz), "utf8"))[chave] ?? [],
    );

const partes = ler("parts", "parts").map((p) => PartSchema.parse(p));
const beys = ler("beyblades", "beyblades").map((b) => BeybladeSchema.parse(b));

describe("integridade do catálogo", () => {
  it("toda peça referenciada por um bey existe", () => {
    const nomes = new Set(partes.map((p) => `${p.brand}|${p.slot}|${p.name}`));
    const faltando = beys.flatMap((b) =>
      Object.entries(b.parts)
        .filter(([slot, nome]) => !nomes.has(`${b.brand}|${slot}|${nome}`))
        .map(([slot, nome]) => `${b.release_code}: ${nome} (${slot})`),
    );
    expect(faltando).toEqual([]);
  });

  it("não há peça duplicada por chave natural", () => {
    const vistas = new Set<string>();
    const dup = partes
      .map((p) => `${p.brand}|${p.slot}|${p.name}`)
      .filter((k) => (vistas.has(k) ? true : (vistas.add(k), false)));
    expect(dup).toEqual([]);
  });

  it("não há bey duplicado por chave natural", () => {
    const vistas = new Set<string>();
    const dup = beys
      .map((b) => `${b.brand}|${b.release_code}|${b.name}`)
      .filter((k) => (vistas.has(k) ? true : (vistas.add(k), false)));
    expect(dup).toEqual([]);
  });

  it("toda anatomia usada existe em anatomies.json", () => {
    const conhecidas = Object.keys(anatomias);
    const desconhecidas = beys.map((b) => b.anatomy).filter((a) => !conhecidas.includes(a));
    expect(desconhecidas).toEqual([]);
  });

  it("todo registro tem source_url", () => {
    const sem = [...partes, ...beys].filter((r) => !r.source_url).length;
    expect(sem).toBe(0);
  });

  it("toda peça hasbro aponta para uma takara_tomy", () => {
    const canonicas = new Set(
      partes.filter((p) => p.brand === "takara_tomy").map((p) => `${p.slot}|${p.name}`),
    );
    const quebradas = partes
      .filter((p) => p.brand === "hasbro")
      .filter((p) => !p.equivalent_name || !canonicas.has(`${p.slot}|${p.equivalent_name}`))
      .map((p) => p.name);
    expect(quebradas).toEqual([]);
  });

  it("nenhum bey usa peça de marca diferente da sua", () => {
    // A composição de um bey Hasbro é feita de peças Hasbro; a resolução para
    // canonical acontece na leitura (spec §4.8), não no dado.
    const nomesPorMarca = new Map<string, Set<string>>();
    for (const p of partes) {
      const s = nomesPorMarca.get(p.brand) ?? new Set();
      s.add(`${p.slot}|${p.name}`);
      nomesPorMarca.set(p.brand, s);
    }
    const erradas = beys.flatMap((b) =>
      Object.entries(b.parts)
        .filter(([slot, nome]) => !nomesPorMarca.get(b.brand)?.has(`${slot}|${nome}`))
        .map(([slot, nome]) => `${b.release_code}: ${nome} (${slot}) não é ${b.brand}`),
    );
    expect(erradas).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar contra os dados do piloto**

Run: `npm test`
Expected: PASS. Os 25 registros do piloto devem passar em tudo — se algum
falhar, é defeito real na curadoria do piloto e deve ser corrigido agora.

- [ ] **Step 3: Commit**

```bash
git add src/lib/seed/integridade.test.ts
git commit -m "test: integridade do catalogo sobre os arquivos de dados"
```

---

**Fim do Chunk 1.** O caminho `data/ → banco` está confiável e testado. Só agora vale curar em volume.

---

## Chunk 2: Curadoria

O item mais caro do projeto inteiro (spec §10). O que o torna caro não é a
digitação: é **conferir cada registro em duas fontes** e resistir à tentação de
preencher lacuna com estimativa.

### Regras da curadoria — leia antes de começar

1. **Duas fontes por registro.** Composição e código de lançamento conferidos em
   fontes independentes. Divergiu, não entra: registre em `notes` e deixe nulo.
2. **Nada de dado inventado.** Sem confirmação → `null`. Uma `release_date`
   errada é pior que ausente, porque parece verdade.
3. **Derivações vão em `notes`**, como o `burst_resistance` dos bits no piloto.
4. **Rodar `npm test` a cada arquivo concluído.** Os testes da Task 3 pegam
   referência órfã, duplicata e coluna em slot errado na hora, não no fim.
5. **Um commit por arquivo de dados.** Curadoria é revisável por diff; um commit
   gigante não é.

### Task 4: Peças da Basic Line (BX)

**Files:**
- Modify: `data/parts/blades.json`, `data/parts/ratchets.json`, `data/parts/bits.json`

- [ ] **Step 1: Levantar a lista completa de peças BX**

Fontes, em ordem de confiança: `beyblade.fandom.com` (composição e lançamento),
`beybxdb.com` e `byybladebuilder.com` (atributos medidos), `worldbeyblade.org`
(discussão e correções da comunidade).

- [ ] **Step 2: Completar `blades.json`** — todas as lâminas BX, com
  ATK/DEF/STA, `weight_g`, `spin_direction` e `part_type`.

- [ ] **Step 3: Completar `ratchets.json`** — com `height_mm`, `contact_points`
  e `burst_resistance`. O nome já codifica altura e pontos de contato (`3-60`),
  mas as colunas existem para ordenar e filtrar sem parsear string.

- [ ] **Step 4: Completar `bits.json`** — com `burst_resistance` e, quando
  houver fonte, `dash_performance` (ficou nulo no piloto por falta de dado).

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit** (um por arquivo, ou um por lote coerente)

```bash
git add data/parts/
git commit -m "data: pecas completas da Basic Line"
```

---

### Task 5: Peças das linhas UX e CX

**Files:**
- Create: `data/parts/assist_blades.json`, `data/parts/lock_chips.json`, `data/parts/main_blades.json`
- Modify: os três arquivos da Task 4 (peças UX/CX que ocupam os mesmos slots)

- [ ] **Step 1: Peças da Unique Line** — lâminas UX e os Assist Blades.

- [ ] **Step 2: Peças da Custom Line** — Lock Chips, Main Blades, Assist Blades CX.

- [ ] **Step 3: Peças da composição Expand**, se já houver dados públicos —
  Metal Blades e Over Blades. **Se a informação ainda for escassa, pare e
  registre**: o schema suporta, mas dado ruim é pior que dado ausente.

- [ ] **Step 4: Testes e commit**

Run: `npm test`

```bash
git add data/parts/
git commit -m "data: pecas das linhas UX e CX"
```

---

### Task 6: Beyblades de todas as linhas

**Files:**
- Modify: `data/beyblades/bx.json`
- Create: `data/beyblades/ux.json`, `data/beyblades/cx.json`

- [ ] **Step 1: Completar a Basic Line** em `bx.json`, a partir dos 11 do piloto.

- [ ] **Step 2: Criar `ux.json`** — anatomia `unique`.

- [ ] **Step 3: Criar `cx.json`** — anatomia `custom` (ou `custom_expand` para
  os que usam Metal Blade + Over Blade).

- [ ] **Step 4: Conferir a derivação de raridade**

`booster`/`starter` → `common`; prêmio de random booster → `rare`;
exclusivo de evento → `exclusive`. Ajuste manual onde o mercado divergir da
regra, registrando o motivo em `notes`.

- [ ] **Step 5: Testes e commit**

Run: `npm test`
Expected: PASS — em especial "toda peça referenciada por um bey existe", que é
o teste que pega erro de digitação em nome de peça.

```bash
git add data/beyblades/
git commit -m "data: catalogo completo de beyblades Takara Tomy"
```

---

### Task 7: Aplicar e conferir no banco

- [ ] **Step 1: Rodar o seed**

Run: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`

- [ ] **Step 2: Conferir os totais**

```sql
select
  (select count(*) from parts)                                   as pecas,
  (select count(*) from beyblades)                               as beys,
  (select count(*) from beyblade_parts)                          as ligacoes,
  (select count(*) from beyblades b where not exists
     (select 1 from beyblade_parts bp where bp.beyblade_id = b.id)) as beys_sem_peca;
```

Expected: `beys_sem_peca` = **0**. Qualquer outro valor é bey gravado sem
composição — o seed falhou parcialmente.

- [ ] **Step 3: Conferir a anatomia de cada bey no banco**

```sql
select b.release_code, b.name from beyblades b
where (select array_agg(bp.slot order by bp.slot) from beyblade_parts bp
         where bp.beyblade_id = b.id)
      is distinct from
      (select array_agg(s.slot order by s.slot) from anatomy_slots s
         where s.anatomy = b.anatomy);
```

Expected: **zero linhas**.

- [ ] **Step 4: Rodar o advisor de segurança**

Depois de escrita em massa, confirmar que nada mudou de postura: nenhuma tabela
sem RLS, catálogo sem policy de escrita.

---

**Fim do Chunk 2.** O catálogo está completo no banco, e a tela do piloto já o exibe — sem uma linha de código novo.

---

## Chunk 3: Imagens e telas de detalhe

### Task 8: Pipeline de imagens

**Files:**
- Create: `scripts/seed-images.ts`
- Modify: `package.json`

**Contexto:** o bucket `bey-images` (público para leitura) e a coluna
`image_path` existem desde a Onda 0. `src/lib/imagens.ts` já monta a URL, e o
card já exibe a imagem quando ela existe. **Falta só preencher.**

- [ ] **Step 1: Instalar o `sharp`**

```bash
npm install --save-dev sharp
```

- [ ] **Step 2: Escrever `scripts/seed-images.ts`**

Requisitos, não código pronto — a fonte das imagens será conhecida só na Task 4:

- Lê de `data/**` um campo `image_source_url` por registro.
- Baixa, converte para WebP, redimensiona para no máximo 800px de largura.
- Envia ao bucket em `beys/<release_code>.webp` e `parts/<slot>-<slug>.webp`.
- Atualiza `image_path` com o caminho **relativo** (spec §4.10).
- **Idempotente:** pula o que já existe no bucket, salvo com `--force`.
- Pausa entre downloads. Raspar imagem de servidor alheio sem intervalo é
  abuso, e derruba o acesso para todos.

- [ ] **Step 3: Rodar para um registro só, e conferir no navegador**

Antes do lote inteiro, processe um bey e abra o catálogo: a imagem deve aparecer
no card sem nenhuma mudança de código. **Se não aparecer, pare** — algo está
errado no caminho relativo ou na policy do bucket, e rodar 150 vezes só
multiplica o problema.

- [ ] **Step 4: Rodar o lote e commitar**

```bash
git add scripts/seed-images.ts package.json data/
git commit -m "feat: pipeline de imagens do catalogo"
```

---

### Task 9: Rotas

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`

`react-router-dom` está instalado desde a Onda 0 e nunca foi usado. As rotas
estão em spec §3.2.

- [ ] **Step 1: Configurar o roteador em `main.tsx`**

Rotas desta onda: `/` (catálogo), `/bey/:id`, `/peca/:id`, `/creditos`.
As autenticadas (`/inventario`, `/combos`) são da Onda 2; `/lab` é da 3.

- [ ] **Step 2: Mover o cabeçalho para um layout compartilhado**, com o título
  levando de volta ao catálogo.

- [ ] **Step 3: Levar busca e filtro para a querystring**

O spec §3.2 pede filtro na URL para link compartilhável. Também resolve um
incômodo real: voltar do detalhe hoje perderia o filtro aplicado.

- [ ] **Step 4: Verificar no navegador** — navegar, voltar, recarregar com
  filtro na URL, e confirmar que o `vercel.json` faz `/bey/xxx` funcionar em
  recarga direta (o rewrite existe desde a Onda 0).

- [ ] **Step 5: Commit**

---

### Task 10: Tela de detalhe do bey

**Files:**
- Create: `src/components/DetalheBey.tsx`, `src/hooks/useBey.ts`

- [ ] **Step 1: Hook que busca um bey com as peças**
- [ ] **Step 2: Tela** — imagem, composição com link para cada peça, atributos
  por peça (antecipando o `explain.ts` da onda 3), lançamentos que trazem esta
  composição, raridade, procedência com link para a fonte.
- [ ] **Step 3: Card do catálogo vira link** para o detalhe.
- [ ] **Step 4: Verificar no navegador**
- [ ] **Step 5: Commit**

---

### Task 11: Tela de detalhe da peça

**Files:**
- Create: `src/components/DetalhePeca.tsx`, `src/hooks/usePeca.ts`

- [ ] **Step 1: Hook que busca a peça e os beys que a contêm**

É a consulta inversa da spec §4.9 — a mesma que o laboratório usará no caminho
peça → wishlist. O índice `beyblade_parts_part_idx` existe para ela desde a
Onda 0.

- [ ] **Step 2: Tela** — atributos, dados físicos, e "onde conseguir esta peça",
  com os beys ordenados por raridade crescente e lançamento decrescente.
- [ ] **Step 3: Verificar no navegador**
- [ ] **Step 4: Commit**

---

### Task 12: Página de créditos e prefetch do catálogo

**Files:**
- Create: `src/components/Creditos.tsx`
- Modify: `src/hooks/useCatalog.ts`

- [ ] **Step 1: Página `/creditos`** — as fontes dos dados e das imagens, e a
  nota de que as artes são da Takara Tomy/Hasbro em uso de fã, com contato para
  remoção (spec §10).
- [ ] **Step 2: Prefetch do catálogo completo** para o cache offline (spec §3.3).
- [ ] **Step 3: Verificar offline** — carregar, desligar a rede, recarregar.
- [ ] **Step 4: Commit**

---

## Critério de conclusão da Onda 1

- [ ] `npm test` e `npm run build` passam.
- [ ] `npm run seed` é idempotente: rodar duas vezes não muda contagem.
- [ ] Nenhum bey sem composição; toda anatomia confere no banco.
- [ ] Todo registro tem `source_url`.
- [ ] Catálogo completo navegável sem login, em produção.
- [ ] Detalhe de bey e de peça funcionando, com link entre eles.
- [ ] Imagens aparecendo, com placeholder onde faltarem.
- [ ] `/creditos` no ar.
- [ ] Nenhum segredo versionado.

## Decisões do usuário — 2026-08-31

As três dúvidas que este plano deixou em aberto foram respondidas:

### 1. Escopo: BX + UX. A linha CX ganha onda própria

A Onda 1 cobre **Basic Line e Unique Line**. A Custom Line (incluindo a
composição Expand) sai para uma onda dedicada.

Além de reduzir o risco da curadoria, o usuário apontou um segundo motivo, que é
melhor que o primeiro: **serve de ensaio para o lançamento de uma linha nova.**
O schema foi desenhado para absorver uma anatomia nova sem migração (spec §4.1);
trazer a CX depois, com o catálogo já em produção, exercita exatamente esse
caminho — e descobre agora, num caso controlado, o que teria de ser descoberto
sob pressão quando a Takara Tomy anunciar a próxima linha.

Consequência prática nas tasks abaixo: a Task 5 fica só com as peças UX, e a
Task 6 com `bx.json` e `ux.json`. Nada de `cx.json` nesta onda.

### 2. Imagens: repositórios públicos, baixadas para o nosso Storage

Fonte: Beyblade Wiki, BeyWiki ou outro repositório público. As imagens **não são
referenciadas por hotlink** — são baixadas e servidas pelo bucket `bey-images`
do Supabase (spec §4.10). O app não tem fins comerciais, e a página `/creditos`
já registra o uso de fã e o canal para pedido de remoção.

Motivo de não usar hotlink, além do óbvio de não onerar servidor alheio: um link
externo quebra quando a outra ponta reorganiza os arquivos, e o catálogo passaria
a exibir buracos sem ninguém perceber.

### 3. Dado divergente: registrar o valor e marcar a divergência

A regra original deste plano era **deixar nulo** quando as fontes divergissem. O
usuário propôs melhor: informar que não há valor oficial, dizer qual foi
encontrado e em quais sites. Deixar nulo esconde informação que temos.

**Implementado** (migration `0011_dado_divergente`):

- Coluna `data_disputed boolean` em `parts` e `beyblades`
- O valor gravado é **o mais citado** entre as fontes
- O detalhe vai em `notes`: *"55 em byybladebuilder, 57 em beybxdb"*
- `src/components/AvisoDivergencia.tsx` mostra isso nas três telas — etiqueta
  discreta no card, bloco explicativo no detalhe

Booleano em vez de só texto em `notes` porque precisa ser **filtrável**: sem
coluna própria não há como listar "tudo que precisa de revisão", e um índice
parcial cobre essa consulta.

Isto **não substitui** a ressalva geral do catálogo: *todo* atributo é medição de
comunidade, e isso está em `/creditos`. `data_disputed` diz algo mais específico
— as fontes não concordam entre si sobre este registro.

