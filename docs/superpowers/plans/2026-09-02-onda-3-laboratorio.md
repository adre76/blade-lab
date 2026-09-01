# Onda 3 — Laboratório: plano de implementação

> **Para executores:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam `- [ ]` para acompanhamento.

**Objetivo:** Montar um bey com peças de qualquer origem e ver, em tempo real, o que esperar dele — atributos, arquétipo, e de onde veio cada número.

**Arquitetura:** Motor TypeScript puro em `src/lib/engine/`, sem React e sem rede, consumido por uma tela de montagem que serializa o combo na querystring. O motor opera na escala bruta dos dados; a normalização para as barras é derivada do catálogo inteiro e aplicada só na apresentação.

**Stack:** TypeScript, Vitest, React 19, react-router-dom v7. Nenhuma dependência nova.

**Spec:** [`docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`](../specs/2026-08-31-blade-x-lab-design.md) §5 (motor), §3.2 (rotas), §9 (testes).

## Restrições globais

- **Nenhuma dependência nova.** O motor é TypeScript puro.
- **O motor não importa React nem `supabase.ts`.** Recebe peças já resolvidas.
- **Escala bruta no motor, normalização na apresentação** (spec §5.3 e §5.4).
- **`data/anatomies.json` é a fonte única** da composição de cada anatomia — a mesma que popula `anatomy_slots` no banco (spec §4.3).
- **Rótulos em português** seguindo `src/components/rotulos.ts`: Ataque, Defesa, **Resistência**, Equilíbrio; Lâmina, Catraca, Ponta.
- **Nenhum número sem origem na tela** (spec §5.6).
- **`npm test` e `npx tsc --noEmit` passam ao fim de cada tarefa.**

## Correções à spec que este plano assume

Três pontos da spec estão desatualizados em relação ao que a Onda 1 apurou. O plano segue o estado real e **a Task 1 corrige o documento**:

1. **§5.1 lista `unique: blade, assist_blade, ratchet, bit`.** Errado — a Unique Line usa três peças, igual à Basic; o Assist Blade é exclusivo da Custom Line. Corrigido em `data/anatomies.json` na Onda 1.
2. **§5.1 não tem `unique_expand`** (lâmina com catraca integrada, 2 slots), criada na Onda 1.
3. **§5.5 e §9 dizem "Stamina".** A interface diz **Resistência** desde 01/09. O nome da *coluna* (`stamina`) não muda.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/anatomias.ts` | **Movido** de `src/lib/seed/`. Lê `data/anatomies.json`. Compartilhado entre seed e motor — é o que impede os dois de divergirem |
| `src/lib/engine/types.ts` | Tipos de peça, combo e resultado. Nenhuma lógica |
| `src/lib/engine/slots.ts` | Slots exigidos por anatomia |
| `src/lib/engine/compatibility.ts` | Válido, incompleto ou inválido |
| `src/lib/engine/stats.ts` | Agregação na escala bruta |
| `src/lib/engine/normalization.ts` | Denominador por anatomia e quartis de peso, derivados do catálogo |
| `src/lib/engine/archetype.ts` | Arquétipo a partir dos atributos normalizados |
| `src/lib/engine/explain.ts` | Contribuição de cada peça em cada atributo |
| `src/hooks/useCombo.ts` | Combo na querystring |
| `src/components/Laboratorio.tsx` | Tela de montagem e análise |
| `src/components/SeletorPeca.tsx` | Escolha de peça para um slot |

Um arquivo por responsabilidade, como o resto do projeto. `types.ts` sem lógica de propósito: todo módulo do motor o importa, e lógica ali criaria dependência circular.

---

## Task 1: Anatomia compartilhada e `slots.ts`

O motor precisa saber quais slots cada anatomia exige. A spec (§5.1) determina que isso venha do mesmo arquivo que popula o banco. O módulo que lê esse arquivo existe, mas mora em `src/lib/seed/` — pasta de scripts de carga, que o frontend não deveria importar.

**Arquivos:**
- Mover: `src/lib/seed/anatomias.ts` → `src/lib/anatomias.ts`
- Modificar: `src/lib/seed/schema.ts`, `src/lib/seed/carregar.ts`, `src/lib/seed/integridade.test.ts` (o import muda de `./anatomias.ts` para `../anatomias.ts`)
- Modificar: `scripts/sync-anatomies.ts` (mesmo import)
- Criar: `src/lib/engine/slots.ts`
- Criar: `src/lib/engine/slots.test.ts`
- Modificar: `src/hooks/useAnatomies.ts:11`
- Modificar: `docs/superpowers/specs/2026-08-31-blade-x-lab-design.md` §5.1

**Interfaces:**
- Consome: `ANATOMIAS` e `slotsDaAnatomia` de `src/lib/anatomias.ts` (já existentes, só mudam de lugar)
- Produz: `slotsDe(anatomy): PartSlot[]`, `ANATOMIAS_CONHECIDAS: Anatomy[]`

- [ ] **Passo 1: mover o módulo e corrigir os imports**

```bash
git mv src/lib/seed/anatomias.ts src/lib/anatomias.ts
```

Em `src/lib/anatomias.ts`, o import do JSON sobe um nível:

```ts
import bruto from "../../data/anatomies.json";
```

Em `src/lib/seed/schema.ts` e `src/lib/seed/integridade.test.ts`, troque `from "./anatomias.ts"` por `from "../anatomias.ts"`. Confira se sobrou algum:

```bash
grep -rn "seed/anatomias\|from \"./anatomias" src scripts
```

- [ ] **Passo 2: rodar os testes para confirmar que nada quebrou**

Rode: `npm test`
Esperado: 55 testes passando, como antes.

- [ ] **Passo 3: escrever o teste que falha de `slots.ts`**

Crie `src/lib/engine/slots.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { slotsDe, ANATOMIAS_CONHECIDAS } from "./slots.ts";
import { ANATOMIAS } from "../anatomias.ts";

describe("slots por anatomia", () => {
  it("reproduz data/anatomies.json — a mesma fonte que popula o banco", () => {
    for (const [anatomia, slots] of Object.entries(ANATOMIAS)) {
      expect(slotsDe(anatomia as never)).toEqual(slots);
    }
  });

  it("conhece as cinco anatomias do catálogo", () => {
    expect([...ANATOMIAS_CONHECIDAS].sort()).toEqual(
      ["basic", "custom", "custom_expand", "unique", "unique_expand"],
    );
  });

  it("a Unique Line tem três slots, e não quatro — o Assist Blade é só da CX", () => {
    expect(slotsDe("unique")).toEqual(["blade", "ratchet", "bit"]);
  });

  it("unique_expand tem dois slots: a catraca vem embutida na lâmina", () => {
    expect(slotsDe("unique_expand")).toEqual(["integrated_blade", "bit"]);
  });

  it("anatomia desconhecida devolve lista vazia, não estoura", () => {
    expect(slotsDe("inexistente" as never)).toEqual([]);
  });
});
```

- [ ] **Passo 4: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/slots.test.ts`
Esperado: FALHA — `Cannot find module './slots.ts'`

- [ ] **Passo 5: implementar `slots.ts`**

Crie `src/lib/engine/slots.ts`:

```ts
import { ANATOMIAS } from "../anatomias.ts";
import type { Anatomy, PartSlot } from "./types.ts";

/**
 * Slots que cada anatomia exige.
 *
 * Vem de `data/anatomies.json`, o MESMO arquivo que popula `anatomy_slots` no
 * banco (spec §4.3). É o que impede o motor e o banco de divergirem: se a
 * composição de uma anatomia mudar, os dois mudam juntos ou o teste de paridade
 * acusa.
 */
export function slotsDe(anatomy: Anatomy): PartSlot[] {
  return (ANATOMIAS[anatomy] ?? []) as PartSlot[];
}

export const ANATOMIAS_CONHECIDAS = Object.keys(ANATOMIAS) as Anatomy[];
```

Crie também `src/lib/engine/types.ts` com o mínimo que este passo precisa — a Task 2 o completa:

```ts
import type { Database } from "../../types/database.ts";

export type Anatomy = Database["public"]["Enums"]["anatomy"];
export type PartSlot = Database["public"]["Enums"]["part_slot"];
```

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/slots.test.ts`
Esperado: PASSA, 5 testes.

- [ ] **Passo 7: corrigir o `filter` que descarta `unique_expand`**

`src/hooks/useAnatomies.ts:11` tem `ORDEM` com quatro anatomias e usa `ORDEM.filter(...)`, o que **descarta silenciosamente** qualquer anatomia fora da lista. `unique_expand` foi criada na Onda 1 e nunca entrou aqui. Nada consome o hook ainda, então o defeito está latente — o laboratório seria o primeiro a encontrá-lo.

```ts
/** Ordem canônica de exibição: da composição mais simples para a mais completa. */
const ORDEM: Anatomy[] = ["unique_expand", "basic", "unique", "custom", "custom_expand"];
```

`unique_expand` vem primeiro por ter dois slots — a ordem é por complexidade de montagem, não por linha.

- [ ] **Passo 8: corrigir a spec**

Em `docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`, §5.1, substitua o bloco de anatomias por:

```
basic          : blade, ratchet, bit
unique         : blade, ratchet, bit
unique_expand  : integrated_blade, bit
custom         : lock_chip, main_blade, assist_blade, ratchet, bit
custom_expand  : lock_chip, metal_blade, over_blade, assist_blade, ratchet, bit
```

E acrescente, logo abaixo do bloco:

```
> Corrigido em 02/09/2026. A tabela original dava quatro slots à `unique`,
> incluindo `assist_blade` — o Assist Blade é exclusivo da Custom Line, e a
> Unique Line usa três peças, igual à Basic. `unique_expand` nasceu na Onda 1.
```

- [ ] **Passo 9: rodar tudo e commitar**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "feat(engine): slots por anatomia, lidos da mesma fonte que o banco"
```

---

## Task 2: Tipos e compatibilidade

**Arquivos:**
- Modificar: `src/lib/engine/types.ts`
- Criar: `src/lib/engine/compatibility.ts`
- Criar: `src/lib/engine/compatibility.test.ts`

**Interfaces:**
- Consome: `slotsDe` da Task 1
- Produz: `Peca`, `Combo`, `Validade`, `validar(combo): Validade`

- [ ] **Passo 1: completar `types.ts`**

```ts
import type { Database } from "../../types/database.ts";

export type Anatomy = Database["public"]["Enums"]["anatomy"];
export type PartSlot = Database["public"]["Enums"]["part_slot"];
export type Resistance = Database["public"]["Enums"]["resistance"];
export type SpinDirection = Database["public"]["Enums"]["spin_direction"];
export type BeyType = Database["public"]["Enums"]["bey_type"];

/** Peça do catálogo, já resolvida para canonical (spec §3.1). */
export type Peca = Database["public"]["Tables"]["parts"]["Row"];

/**
 * Uma montagem. Slot vazio simplesmente não está no mapa — é o estado normal
 * durante a montagem, e o motor analisa assim mesmo (spec §5.2).
 */
export type Combo = {
  anatomy: Anatomy;
  pecas: Partial<Record<PartSlot, Peca>>;
};

/**
 * Valor que o motor não tem como calcular, por falta de peça ou de dado.
 * Existe como valor de primeira classe para a interface poder dizer
 * "desconhecido" em vez de exibir um número inventado (spec §5.3).
 */
export const DESCONHECIDO = "desconhecido" as const;
export type Desconhecido = typeof DESCONHECIDO;
```

- [ ] **Passo 2: escrever o teste que falha**

Crie `src/lib/engine/compatibility.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validar } from "./compatibility.ts";
import type { Combo, Peca } from "./types.ts";

/** Peça mínima: só o que o motor lê. O resto do Row não participa de regra. */
const peca = (slot: string, extra: Partial<Peca> = {}) =>
  ({ id: `id-${slot}`, slot, name: slot, attack: 0, defense: 0, stamina: 0,
     weight_g: null, height_mm: null, contact_points: null,
     burst_resistance: null, dash_performance: null, spin_direction: null,
     ...extra } as unknown as Peca);

const combo = (anatomy: Combo["anatomy"], pecas: Combo["pecas"]): Combo =>
  ({ anatomy, pecas });

describe("compatibilidade", () => {
  it("combo completo é válido", () => {
    const c = combo("basic", {
      blade: peca("blade"), ratchet: peca("ratchet"), bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });

  it("faltando slots é incompleto, não inválido — é o estado normal da montagem", () => {
    const c = combo("basic", { blade: peca("blade") });
    expect(validar(c)).toEqual({ estado: "incompleto", faltando: ["ratchet", "bit"] });
  });

  it("combo vazio é incompleto com todos os slots faltando", () => {
    expect(validar(combo("basic", {}))).toEqual({
      estado: "incompleto", faltando: ["blade", "ratchet", "bit"],
    });
  });

  it("peça cujo slot não bate com a posição é inválido", () => {
    const c = combo("basic", {
      blade: peca("bit"), ratchet: peca("ratchet"), bit: peca("bit"),
    });
    const r = validar(c);
    expect(r.estado).toBe("invalido");
    expect(r.estado === "invalido" && r.problemas[0]).toContain("blade");
  });

  it("slot fora da anatomia é inválido", () => {
    const c = combo("basic", {
      blade: peca("blade"), ratchet: peca("ratchet"), bit: peca("bit"),
      assist_blade: peca("assist_blade"),
    });
    const r = validar(c);
    expect(r.estado).toBe("invalido");
    expect(r.estado === "invalido" && r.problemas[0]).toContain("assist_blade");
  });

  it("slot errado tem precedência sobre slot faltando", () => {
    const c = combo("basic", { blade: peca("bit") });
    expect(validar(c).estado).toBe("invalido");
  });

  it("valida unique_expand com dois slots", () => {
    const c = combo("unique_expand", {
      integrated_blade: peca("integrated_blade"), bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });

  it("valida custom_expand com seis slots", () => {
    const c = combo("custom_expand", {
      lock_chip: peca("lock_chip"), metal_blade: peca("metal_blade"),
      over_blade: peca("over_blade"), assist_blade: peca("assist_blade"),
      ratchet: peca("ratchet"), bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });

  it("peça de outra linha é aceita: compatibilidade é por slot, não por linha", () => {
    const c = combo("custom_expand", {
      lock_chip: peca("lock_chip"), metal_blade: peca("metal_blade"),
      over_blade: peca("over_blade"), assist_blade: peca("assist_blade"),
      ratchet: peca("ratchet", { line: "BX" } as Partial<Peca>),
      bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });
});
```

- [ ] **Passo 3: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/compatibility.test.ts`
Esperado: FALHA — `Cannot find module './compatibility.ts'`

- [ ] **Passo 4: implementar**

Crie `src/lib/engine/compatibility.ts`:

```ts
import { slotsDe } from "./slots.ts";
import type { Combo, PartSlot } from "./types.ts";

export type Validade =
  | { estado: "valido" }
  | { estado: "incompleto"; faltando: PartSlot[] }
  | { estado: "invalido"; problemas: string[] };

/**
 * Estado de uma montagem (spec §5.2).
 *
 * `incompleto` NÃO é erro: é o estado normal enquanto se monta, e o
 * laboratório analisa assim mesmo, exibindo os atributos parciais. Só um combo
 * `valido` pode ser salvo — o banco impõe isso por trigger (spec §4.6).
 *
 * `line` não participa de nenhuma regra: a peça é compatível pelo SLOT que
 * ocupa, não pela linha em que estreou. Um ratchet lançado na BX é legal num
 * combo custom_expand.
 */
export function validar(combo: Combo): Validade {
  const exigidos = slotsDe(combo.anatomy);
  const problemas: string[] = [];

  for (const [slot, peca] of Object.entries(combo.pecas) as [PartSlot, Combo["pecas"][PartSlot]][]) {
    if (!peca) continue;
    if (!exigidos.includes(slot)) {
      problemas.push(`a anatomia '${combo.anatomy}' não tem slot '${slot}'`);
    } else if (peca.slot !== slot) {
      problemas.push(`peça '${peca.name}' é de '${peca.slot}' e está no slot '${slot}'`);
    }
  }

  if (problemas.length) return { estado: "invalido", problemas };

  const faltando = exigidos.filter((s) => !combo.pecas[s]);
  return faltando.length ? { estado: "incompleto", faltando } : { estado: "valido" };
}
```

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/compatibility.test.ts`
Esperado: PASSA, 9 testes.

- [ ] **Passo 6: commitar**

```bash
npm test && npx tsc --noEmit
git add src/lib/engine/
git commit -m "feat(engine): tipos e validacao de compatibilidade do combo"
```

---

## Task 3: Agregação (`stats.ts`)

**Arquivos:**
- Criar: `src/lib/engine/stats.ts`
- Criar: `src/lib/engine/stats.test.ts`

**Interfaces:**
- Consome: `Combo`, `Peca`, `DESCONHECIDO` da Task 2
- Produz: `Atributos`, `agregar(combo): Atributos`, `ORDINAL_RESISTENCIA`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/engine/stats.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { agregar, ORDINAL_RESISTENCIA } from "./stats.ts";
import { DESCONHECIDO } from "./types.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (slot: string, extra: Partial<Peca> = {}) =>
  ({ id: `id-${slot}`, slot, name: slot, attack: 0, defense: 0, stamina: 0,
     weight_g: null, height_mm: null, contact_points: null,
     burst_resistance: null, dash_performance: null, spin_direction: null,
     ...extra } as unknown as Peca);

const basico = (pecas: Combo["pecas"]): Combo => ({ anatomy: "basic", pecas });

describe("agregação", () => {
  it("soma os três atributos de todos os slots preenchidos", () => {
    const r = agregar(basico({
      blade: peca("blade", { attack: 60, defense: 25, stamina: 15 }),
      ratchet: peca("ratchet", { attack: 15, defense: 9, stamina: 6 }),
      bit: peca("bit", { attack: 45, defense: 5, stamina: 10 }),
    }));
    expect(r.attack).toBe(120);
    expect(r.defense).toBe(39);
    expect(r.stamina).toBe(31);
  });

  it("combo vazio soma zero e não estoura", () => {
    const r = agregar(basico({}));
    expect([r.attack, r.defense, r.stamina]).toEqual([0, 0, 0]);
  });

  it("burst é o MÍNIMO entre catraca e ponta", () => {
    const r = agregar(basico({
      ratchet: peca("ratchet", { burst_resistance: "high" }),
      bit: peca("bit", { burst_resistance: "low" }),
    }));
    expect(r.burst_resistance).toBe("low");
  });

  it("slot ausente e coluna nula são o mesmo caso: quem não tem dado não entra no mínimo", () => {
    const so_catraca = agregar(basico({
      ratchet: peca("ratchet", { burst_resistance: "medium" }),
    }));
    const ponta_nula = agregar(basico({
      ratchet: peca("ratchet", { burst_resistance: "medium" }),
      bit: peca("bit", { burst_resistance: null }),
    }));
    expect(so_catraca.burst_resistance).toBe("medium");
    expect(ponta_nula.burst_resistance).toBe("medium");
  });

  it("burst é desconhecido quando ninguém contribui — e não um número inventado", () => {
    expect(agregar(basico({ blade: peca("blade") })).burst_resistance).toBe(DESCONHECIDO);
  });

  it("o Lock Chip não participa do burst: ele prende as lâminas, não a retenção", () => {
    const r = agregar({
      anatomy: "custom",
      pecas: {
        lock_chip: peca("lock_chip", { burst_resistance: "very_low" }),
        ratchet: peca("ratchet", { burst_resistance: "high" }),
        bit: peca("bit", { burst_resistance: "high" }),
      },
    });
    expect(r.burst_resistance).toBe("high");
  });

  it("altura vem da catraca, e é desconhecida sem ela", () => {
    expect(agregar(basico({ ratchet: peca("ratchet", { height_mm: 60 }) })).height_mm).toBe(60);
    expect(agregar(basico({ blade: peca("blade") })).height_mm).toBe(DESCONHECIDO);
  });

  it("na unique_expand a altura vem da lâmina com catraca integrada", () => {
    const r = agregar({
      anatomy: "unique_expand",
      pecas: { integrated_blade: peca("integrated_blade", { height_mm: 80 }) },
    });
    expect(r.height_mm).toBe(80);
  });

  it("peso nulo conta como zero e marca o total como parcial", () => {
    const r = agregar(basico({
      blade: peca("blade", { weight_g: 34.5 }),
      ratchet: peca("ratchet", { weight_g: null }),
    }));
    expect(r.weight_g).toBeCloseTo(34.5);
    expect(r.pesoParcial).toBe(true);
  });

  it("peso completo não é parcial", () => {
    const r = agregar(basico({
      blade: peca("blade", { weight_g: 34.5 }),
      ratchet: peca("ratchet", { weight_g: 6.8 }),
    }));
    expect(r.weight_g).toBeCloseTo(41.3);
    expect(r.pesoParcial).toBe(false);
  });

  it("giro vem da lâmina principal, na ordem blade → integrated → main → metal", () => {
    expect(agregar(basico({
      blade: peca("blade", { spin_direction: "left" }),
    })).spin_direction).toBe("left");

    expect(agregar({
      anatomy: "unique_expand",
      pecas: { integrated_blade: peca("integrated_blade", { spin_direction: "right" }) },
    }).spin_direction).toBe("right");

    expect(agregar(basico({ ratchet: peca("ratchet") })).spin_direction).toBe(DESCONHECIDO);
  });

  it("giro dual é propagado como dual", () => {
    expect(agregar(basico({
      blade: peca("blade", { spin_direction: "dual" }),
    })).spin_direction).toBe("dual");
  });

  it("a escala ordinal de resistência é a da spec", () => {
    expect(ORDINAL_RESISTENCIA).toEqual({
      very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
    });
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/stats.test.ts`
Esperado: FALHA — `Cannot find module './stats.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/engine/stats.ts`:

```ts
import { DESCONHECIDO } from "./types.ts";
import type { Combo, Desconhecido, PartSlot, Peca, Resistance, SpinDirection } from "./types.ts";

/** Escala ordinal de `resistance` (spec §5.3), para poder tirar o mínimo. */
export const ORDINAL_RESISTENCIA: Record<Resistance, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};

const POR_ORDINAL = Object.entries(ORDINAL_RESISTENCIA)
  .reduce<Record<number, Resistance>>((acc, [k, v]) => ({ ...acc, [v]: k as Resistance }), {});

/**
 * Slots cuja retenção decide o burst.
 *
 * O Lock Chip fica de fora de propósito: a retenção depende do encaixe entre
 * catraca e ponta, e o Lock Chip prende as lâminas entre si (spec §5.3). Na
 * unique_expand a catraca vem embutida na lâmina, então é ela quem entra.
 */
const SLOTS_DE_BURST: PartSlot[] = ["ratchet", "integrated_blade", "bit"];

/** Slots que carregam altura: a catraca, ou a lâmina que a traz embutida. */
const SLOTS_DE_ALTURA: PartSlot[] = ["ratchet", "integrated_blade"];

/** Precedência do sentido de giro: só a lâmina principal o carrega (spec §4.4). */
const ORDEM_GIRO: PartSlot[] = ["blade", "integrated_blade", "main_blade", "metal_blade"];

export type Atributos = {
  attack: number;
  defense: number;
  stamina: number;
  weight_g: number;
  /** true quando alguma peça não tem peso registrado: o total não é exato. */
  pesoParcial: boolean;
  burst_resistance: Resistance | Desconhecido;
  height_mm: number | Desconhecido;
  spin_direction: SpinDirection | Desconhecido;
};

/**
 * Atributos do combo, na ESCALA BRUTA dos dados (spec §5.3).
 *
 * A normalização para 0–100 é de apresentação e mora em `normalization.ts`:
 * misturar as duas aqui faria a soma das contribuições de `explain.ts` deixar
 * de reproduzir o total.
 */
export function agregar(combo: Combo): Atributos {
  const entradas = Object.entries(combo.pecas)
    .filter((e): e is [PartSlot, Peca] => Boolean(e[1]));

  let attack = 0, defense = 0, stamina = 0, weight_g = 0, pesoParcial = false;
  for (const [, p] of entradas) {
    attack += p.attack;
    defense += p.defense;
    stamina += p.stamina;
    if (p.weight_g == null) pesoParcial = true;
    else weight_g += Number(p.weight_g);
  }

  const ordinais = entradas
    .filter(([slot]) => SLOTS_DE_BURST.includes(slot))
    .map(([, p]) => p.burst_resistance)
    .filter((r): r is Resistance => r != null)
    .map((r) => ORDINAL_RESISTENCIA[r]);

  const alturas = entradas
    .filter(([slot]) => SLOTS_DE_ALTURA.includes(slot))
    .map(([, p]) => p.height_mm)
    .filter((h): h is number => h != null);

  const giro = ORDEM_GIRO
    .map((slot) => combo.pecas[slot]?.spin_direction)
    .find((g): g is SpinDirection => g != null);

  return {
    attack, defense, stamina,
    weight_g: Number(weight_g.toFixed(2)),
    pesoParcial,
    burst_resistance: ordinais.length ? POR_ORDINAL[Math.min(...ordinais)]! : DESCONHECIDO,
    height_mm: alturas.length ? Math.max(...alturas) : DESCONHECIDO,
    spin_direction: giro ?? DESCONHECIDO,
  };
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/stats.test.ts`
Esperado: PASSA, 13 testes.

- [ ] **Passo 5: commitar**

```bash
npm test && npx tsc --noEmit
git add src/lib/engine/
git commit -m "feat(engine): agregacao dos atributos na escala bruta"
```

---

## Task 4: Normalização (`normalization.ts`)

**Arquivos:**
- Criar: `src/lib/engine/normalization.ts`
- Criar: `src/lib/engine/normalization.test.ts`

**Interfaces:**
- Consome: `Peca`, `Anatomy` da Task 2; `slotsDe` da Task 1
- Produz: `Contexto`, `derivarContexto(pecas, beysDeFabrica): Contexto`, `normalizar(valor, maximo): number`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/engine/normalization.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { derivarContexto, normalizar } from "./normalization.ts";
import type { Peca } from "./types.ts";

const peca = (slot: string, attack: number, defense: number, stamina: number) =>
  ({ id: `${slot}-${attack}`, slot, name: `${slot} ${attack}`,
     attack, defense, stamina } as unknown as Peca);

const CATALOGO: Peca[] = [
  peca("blade", 60, 25, 15), peca("blade", 10, 65, 25),
  peca("ratchet", 15, 9, 6), peca("ratchet", 3, 14, 13),
  peca("bit", 45, 5, 10), peca("bit", 5, 20, 40),
  peca("integrated_blade", 85, 35, 25),
];

describe("normalização", () => {
  it("o denominador é o máximo teórico da anatomia: melhor peça de cada slot", () => {
    const ctx = derivarContexto(CATALOGO, []);
    // basic = blade + ratchet + bit; ataque: 60 + 15 + 45
    expect(ctx.maximos.basic).toEqual({ attack: 120, defense: 99, stamina: 71 });
  });

  it("cada anatomia tem seu próprio denominador", () => {
    const ctx = derivarContexto(CATALOGO, []);
    // unique_expand = integrated_blade + bit; ataque: 85 + 45
    expect(ctx.maximos.unique_expand).toEqual({ attack: 130, defense: 55, stamina: 65 });
  });

  it("anatomia sem peça para nenhum slot tem denominador zero", () => {
    const ctx = derivarContexto(CATALOGO, []);
    expect(ctx.maximos.custom).toEqual({ attack: 0, defense: 0, stamina: 0 });
  });

  it("catálogo vazio não estoura", () => {
    const ctx = derivarContexto([], []);
    expect(ctx.maximos.basic).toEqual({ attack: 0, defense: 0, stamina: 0 });
    expect(ctx.quartis).toBeNull();
  });

  it("normalizar devolve 0–100 e trata denominador zero", () => {
    expect(normalizar(60, 120)).toBe(50);
    expect(normalizar(0, 120)).toBe(0);
    expect(normalizar(10, 0)).toBe(0);
  });

  it("normalizar não passa de 100 nem fica negativo", () => {
    expect(normalizar(200, 120)).toBe(100);
    expect(normalizar(-5, 120)).toBe(0);
  });

  it("os quartis de peso saem dos beys de fábrica", () => {
    const beys = [10, 20, 30, 40, 50].map((pesoTotal) => ({ pesoTotal, parcial: false }));
    const ctx = derivarContexto(CATALOGO, beys);
    expect(ctx.quartis).toEqual({ q1: 20, q3: 40 });
  });

  it("bey de peso parcial fica FORA da população: puxaria a distribuição para baixo", () => {
    const beys = [
      ...[10, 20, 30, 40, 50].map((pesoTotal) => ({ pesoTotal, parcial: false })),
      { pesoTotal: 1, parcial: true },
      { pesoTotal: 2, parcial: true },
    ];
    expect(derivarContexto(CATALOGO, beys).quartis).toEqual({ q1: 20, q3: 40 });
  });

  it("população vazia ou de um só bey não produz quartis", () => {
    expect(derivarContexto(CATALOGO, []).quartis).toBeNull();
    expect(derivarContexto(CATALOGO, [{ pesoTotal: 40, parcial: false }]).quartis).toBeNull();
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/normalization.test.ts`
Esperado: FALHA — `Cannot find module './normalization.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/engine/normalization.ts`:

```ts
import { ANATOMIAS_CONHECIDAS, slotsDe } from "./slots.ts";
import type { Anatomy, Peca } from "./types.ts";

type Trio = { attack: number; defense: number; stamina: number };

export type PesoDeFabrica = { pesoTotal: number; parcial: boolean };

export type Contexto = {
  /** Máximo teórico por anatomia — o denominador das barras (spec §5.4). */
  maximos: Record<Anatomy, Trio>;
  /** Quartis do peso dos beys de fábrica. Nulo quando a população é pequena demais. */
  quartis: { q1: number; q3: number } | null;
};

const ATRIBUTOS = ["attack", "defense", "stamina"] as const;

/**
 * Contexto de normalização, derivado do CATÁLOGO INTEIRO.
 *
 * O denominador é o máximo teórico da anatomia — para cada slot, a melhor peça
 * do catálogo naquele atributo — e não o máximo entre os beys de fábrica. O
 * produto é sobre híbridos: uma barra que estoura os 100% quando alguém monta
 * algo melhor que qualquer bey de fábrica seria um defeito visível.
 *
 * É também por isso que a Onda 1 faz prefetch do catálogo completo: com
 * catálogo parcial, o mesmo combo mudaria de barra entre sessões.
 */
export function derivarContexto(pecas: Peca[], beys: PesoDeFabrica[]): Contexto {
  const melhorPorSlot = new Map<string, Trio>();
  for (const p of pecas) {
    const atual = melhorPorSlot.get(p.slot) ?? { attack: 0, defense: 0, stamina: 0 };
    melhorPorSlot.set(p.slot, {
      attack: Math.max(atual.attack, p.attack),
      defense: Math.max(atual.defense, p.defense),
      stamina: Math.max(atual.stamina, p.stamina),
    });
  }

  const maximos = {} as Record<Anatomy, Trio>;
  for (const anatomia of ANATOMIAS_CONHECIDAS) {
    const soma: Trio = { attack: 0, defense: 0, stamina: 0 };
    for (const slot of slotsDe(anatomia)) {
      const melhor = melhorPorSlot.get(slot);
      if (!melhor) continue;
      for (const a of ATRIBUTOS) soma[a] += melhor[a];
    }
    maximos[anatomia] = soma;
  }

  // Peso parcial fica fora: um bey com peça sem peso registrado pesa menos do
  // que pesa, e puxaria os quartis para baixo — produzindo "pesado" com folga
  // demais (spec §5.5).
  const pesos = beys.filter((b) => !b.parcial).map((b) => b.pesoTotal).sort((a, b) => a - b);

  return { maximos, quartis: pesos.length >= 2 ? { q1: quartil(pesos, 0.25), q3: quartil(pesos, 0.75) } : null };
}

/** Quartil por interpolação linear, sobre uma lista já ordenada. */
function quartil(ordenados: number[], p: number): number {
  const pos = (ordenados.length - 1) * p;
  const baixo = Math.floor(pos);
  const alto = Math.ceil(pos);
  if (baixo === alto) return ordenados[baixo]!;
  return ordenados[baixo]! + (ordenados[alto]! - ordenados[baixo]!) * (pos - baixo);
}

/**
 * Converte um valor bruto para a escala 0–100 das barras.
 *
 * Denominador zero devolve 0, e não NaN: acontece de verdade nas anatomias
 * cujas peças ainda não estão no catálogo (a CX, hoje).
 */
export function normalizar(valor: number, maximo: number): number {
  if (maximo <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((valor / maximo) * 100)));
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/normalization.test.ts`
Esperado: PASSA, 9 testes.

- [ ] **Passo 5: commitar**

```bash
npm test && npx tsc --noEmit
git add src/lib/engine/
git commit -m "feat(engine): denominador por anatomia e quartis de peso"
```

---

## Task 5: Arquétipo (`archetype.ts`)

**Arquivos:**
- Criar: `src/lib/engine/archetype.ts`
- Criar: `src/lib/engine/archetype.test.ts`

**Interfaces:**
- Consome: `Atributos` da Task 3; `Contexto` da Task 4; `ORDINAL_RESISTENCIA` da Task 3
- Produz: `Arquetipo`, `classificar(atributos, contexto, anatomy): Arquetipo`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/engine/archetype.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classificar } from "./archetype.ts";
import { DESCONHECIDO } from "./types.ts";
import type { Atributos } from "./stats.ts";
import type { Contexto } from "./normalization.ts";

const CTX: Contexto = {
  maximos: {
    basic: { attack: 100, defense: 100, stamina: 100 },
    unique: { attack: 100, defense: 100, stamina: 100 },
    unique_expand: { attack: 100, defense: 100, stamina: 100 },
    custom: { attack: 100, defense: 100, stamina: 100 },
    custom_expand: { attack: 100, defense: 100, stamina: 100 },
  },
  quartis: { q1: 40, q3: 46 },
};

const attrs = (extra: Partial<Atributos>): Atributos => ({
  attack: 0, defense: 0, stamina: 0, weight_g: 43, pesoParcial: false,
  burst_resistance: "medium", height_mm: 60, spin_direction: "right", ...extra,
});

describe("arquétipo", () => {
  it("dominante com 15 pontos ou mais de folga é arquétipo puro", () => {
    const r = classificar(attrs({ attack: 70, defense: 40, stamina: 30 }), CTX, "basic");
    expect(r.rotulo).toBe("Ataque");
    expect(r.dominante).toBe("attack");
  });

  it("exatamente 15 pontos de folga já é puro", () => {
    expect(classificar(attrs({ attack: 55, defense: 40, stamina: 30 }), CTX, "basic").rotulo)
      .toBe("Ataque");
  });

  it("menos de 15 pontos é equilibrado, qualificado pelos dois maiores", () => {
    const r = classificar(attrs({ attack: 50, defense: 20, stamina: 44 }), CTX, "basic");
    expect(r.rotulo).toBe("Equilibrado — Ataque/Resistência");
    expect(r.dominante).toBeNull();
  });

  it("usa os rótulos em português, com Resistência no lugar de Stamina", () => {
    expect(classificar(attrs({ stamina: 80, attack: 10, defense: 10 }), CTX, "basic").rotulo)
      .toBe("Resistência");
  });

  it("empate é resolvido na ordem fixa Ataque > Defesa > Resistência", () => {
    const r = classificar(attrs({ attack: 50, defense: 50, stamina: 50 }), CTX, "basic");
    expect(r.rotulo).toBe("Equilibrado — Ataque/Defesa");
  });

  it("burst baixo qualifica como frágil", () => {
    const r = classificar(
      attrs({ attack: 70, defense: 20, stamina: 20, burst_resistance: "low" }), CTX, "basic");
    expect(r.qualificadores).toContain("frágil");
  });

  it("burst alto qualifica como resistente", () => {
    const r = classificar(
      attrs({ attack: 70, defense: 20, stamina: 20, burst_resistance: "high" }), CTX, "basic");
    expect(r.qualificadores).toContain("resistente");
  });

  it("burst médio não qualifica", () => {
    const r = classificar(
      attrs({ attack: 70, defense: 20, stamina: 20, burst_resistance: "medium" }), CTX, "basic");
    expect(r.qualificadores).not.toContain("frágil");
    expect(r.qualificadores).not.toContain("resistente");
  });

  it("burst desconhecido NÃO qualifica: falta de dado não é fragilidade", () => {
    const r = classificar(
      attrs({ attack: 70, burst_resistance: DESCONHECIDO }), CTX, "basic");
    expect(r.qualificadores).toEqual([]);
  });

  it("peso acima do terceiro quartil qualifica como pesado", () => {
    expect(classificar(attrs({ attack: 70, weight_g: 48 }), CTX, "basic").qualificadores)
      .toContain("pesado");
  });

  it("peso abaixo do primeiro quartil qualifica como leve", () => {
    expect(classificar(attrs({ attack: 70, weight_g: 38 }), CTX, "basic").qualificadores)
      .toContain("leve");
  });

  it("peso parcial NÃO qualifica: o total não é o real", () => {
    const r = classificar(attrs({ attack: 70, weight_g: 48, pesoParcial: true }), CTX, "basic");
    expect(r.qualificadores).not.toContain("pesado");
  });

  it("sem quartis no contexto, nenhum qualificador de peso", () => {
    const semQuartis: Contexto = { ...CTX, quartis: null };
    expect(classificar(attrs({ attack: 70, weight_g: 48 }), semQuartis, "basic").qualificadores)
      .not.toContain("pesado");
  });

  it("combo vazio é equilibrado sem qualificadores de atributo", () => {
    const r = classificar(attrs({ burst_resistance: DESCONHECIDO, pesoParcial: true }),
                          CTX, "basic");
    expect(r.rotulo).toBe("Equilibrado — Ataque/Defesa");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/archetype.test.ts`
Esperado: FALHA — `Cannot find module './archetype.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/engine/archetype.ts`:

```ts
import { normalizar } from "./normalization.ts";
import { ORDINAL_RESISTENCIA } from "./stats.ts";
import { DESCONHECIDO } from "./types.ts";
import type { Contexto } from "./normalization.ts";
import type { Atributos } from "./stats.ts";
import type { Anatomy, BeyType } from "./types.ts";

/** Folga mínima, em pontos normalizados, para o arquétipo ser puro (spec §5.5). */
const FOLGA_PURO = 15;

/**
 * Ordem fixa de desempate: Ataque > Defesa > Resistência.
 * Existe para a classificação ser determinística e testável.
 */
const ORDEM: BeyType[] = ["attack", "defense", "stamina"];

const ROTULO: Record<BeyType, string> = {
  attack: "Ataque", defense: "Defesa", stamina: "Resistência", balance: "Equilibrado",
};

export type Arquetipo = {
  /** "Ataque", "Equilibrado — Ataque/Resistência". */
  rotulo: string;
  /** Preenchido só no arquétipo puro. */
  dominante: BeyType | null;
  /** "frágil" | "resistente" | "pesado" | "leve" */
  qualificadores: string[];
};

/**
 * Classifica o combo a partir dos atributos NORMALIZADOS (spec §5.5).
 *
 * Normalizados, e não brutos, porque os três atributos têm tetos diferentes:
 * comparar ataque bruto com resistência bruta faria todo combo parecer de
 * ataque, já que a escala de ataque é a mais alta.
 */
export function classificar(
  atributos: Atributos, contexto: Contexto, anatomy: Anatomy,
): Arquetipo {
  const max = contexto.maximos[anatomy];
  const valores = ORDEM.map((a) => ({ atributo: a, valor: normalizar(atributos[a], max[a]) }));

  // sort estável: com valores iguais, ORDEM decide — daí o desempate fixo
  const [primeiro, segundo] = [...valores].sort((a, b) => b.valor - a.valor);

  const puro = primeiro!.valor - segundo!.valor >= FOLGA_PURO;
  const rotulo = puro
    ? ROTULO[primeiro!.atributo]
    : `Equilibrado — ${ROTULO[primeiro!.atributo]}/${ROTULO[segundo!.atributo]}`;

  const qualificadores: string[] = [];

  // Ausência de dado não é fragilidade: burst desconhecido não qualifica.
  if (atributos.burst_resistance !== DESCONHECIDO) {
    const ordinal = ORDINAL_RESISTENCIA[atributos.burst_resistance];
    if (ordinal <= 2) qualificadores.push("frágil");
    else if (ordinal >= 4) qualificadores.push("resistente");
  }

  // Peso parcial também não: o total não é o real.
  if (contexto.quartis && !atributos.pesoParcial) {
    if (atributos.weight_g > contexto.quartis.q3) qualificadores.push("pesado");
    else if (atributos.weight_g < contexto.quartis.q1) qualificadores.push("leve");
  }

  return { rotulo, dominante: puro ? primeiro!.atributo : null, qualificadores };
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/archetype.test.ts`
Esperado: PASSA, 14 testes.

- [ ] **Passo 5: commitar**

```bash
npm test && npx tsc --noEmit
git add src/lib/engine/
git commit -m "feat(engine): classificacao do arquetipo do combo"
```

---

## Task 6: Transparência (`explain.ts`)

**Arquivos:**
- Criar: `src/lib/engine/explain.ts`
- Criar: `src/lib/engine/explain.test.ts`

**Interfaces:**
- Consome: `Combo`, `Peca`, `PartSlot` da Task 2; `agregar` da Task 3
- Produz: `Contribuicao`, `contribuicoes(combo): Contribuicao[]`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/engine/explain.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contribuicoes } from "./explain.ts";
import { agregar } from "./stats.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (slot: string, attack: number, defense: number, stamina: number) =>
  ({ id: `id-${slot}`, slot, name: `${slot}!`, attack, defense, stamina,
     weight_g: null } as unknown as Peca);

const COMBO: Combo = {
  anatomy: "basic",
  pecas: {
    blade: peca("blade", 60, 25, 15),
    ratchet: peca("ratchet", 15, 9, 6),
    bit: peca("bit", 45, 5, 10),
  },
};

describe("contribuição por peça", () => {
  it("devolve uma entrada por slot preenchido, na ordem da anatomia", () => {
    expect(contribuicoes(COMBO).map((c) => c.slot)).toEqual(["blade", "ratchet", "bit"]);
  });

  it("a contribuição é o valor bruto da peça", () => {
    const [blade] = contribuicoes(COMBO);
    expect(blade).toMatchObject({ attack: 60, defense: 25, stamina: 15 });
    expect(blade!.peca.name).toBe("blade!");
  });

  /**
   * A propriedade que sustenta a promessa de "nenhum número sem origem":
   * se a soma das parcelas não reproduzisse o total, a tela estaria mentindo.
   */
  it("a soma das contribuições reproduz o total agregado", () => {
    for (const c of [COMBO, { ...COMBO, anatomy: "unique" as const }]) {
      const total = agregar(c);
      const soma = contribuicoes(c).reduce(
        (acc, x) => ({ attack: acc.attack + x.attack, defense: acc.defense + x.defense,
                       stamina: acc.stamina + x.stamina }),
        { attack: 0, defense: 0, stamina: 0 },
      );
      expect(soma).toEqual({
        attack: total.attack, defense: total.defense, stamina: total.stamina,
      });
    }
  });

  it("a propriedade vale também na unique_expand, de dois slots", () => {
    const c: Combo = {
      anatomy: "unique_expand",
      pecas: {
        integrated_blade: peca("integrated_blade", 85, 35, 25),
        bit: peca("bit", 45, 5, 10),
      },
    };
    const total = agregar(c);
    const soma = contribuicoes(c).reduce((a, x) => a + x.attack, 0);
    expect(soma).toBe(total.attack);
  });

  it("combo vazio não contribui com nada", () => {
    expect(contribuicoes({ anatomy: "basic", pecas: {} })).toEqual([]);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/explain.test.ts`
Esperado: FALHA — `Cannot find module './explain.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/engine/explain.ts`:

```ts
import { slotsDe } from "./slots.ts";
import type { Combo, PartSlot, Peca } from "./types.ts";

export type Contribuicao = {
  slot: PartSlot;
  peca: Peca;
  attack: number;
  defense: number;
  stamina: number;
};

/**
 * O que cada peça pôs em cada atributo, na MESMA escala bruta de `stats.ts`
 * (spec §5.6).
 *
 * A mesma escala não é detalhe: é o que faz a soma das parcelas reproduzir
 * exatamente o total. A conversão para a escala das barras acontece na
 * apresentação, aplicando o mesmo denominador ao total e às parcelas — se
 * cada parcela fosse normalizada aqui, os arredondamentos não fechariam.
 *
 * A ordem é a da anatomia, da lâmina para a ponta, e não a de inserção: a
 * tela lê de cima para baixo como a peça é montada.
 */
export function contribuicoes(combo: Combo): Contribuicao[] {
  return slotsDe(combo.anatomy)
    .map((slot) => ({ slot, peca: combo.pecas[slot] }))
    .filter((x): x is { slot: PartSlot; peca: Peca } => Boolean(x.peca))
    .map(({ slot, peca }) => ({
      slot, peca,
      attack: peca.attack, defense: peca.defense, stamina: peca.stamina,
    }));
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/explain.test.ts`
Esperado: PASSA, 5 testes.

- [ ] **Passo 5: commitar**

```bash
npm test && npx tsc --noEmit
git add src/lib/engine/
git commit -m "feat(engine): contribuicao de cada peca em cada atributo"
```

---

## Task 7: O combo na querystring (`useCombo.ts`)

A montagem tem de ser compartilhável por link (spec §3.2) e sobreviver a um recarregamento.

**Arquivos:**
- Criar: `src/hooks/useCombo.ts`
- Criar: `src/lib/engine/serializacao.ts`
- Criar: `src/lib/engine/serializacao.test.ts`

**Interfaces:**
- Consome: `Combo`, `Peca`, `Anatomy` da Task 2
- Produz: `serializar(combo): string`, `desserializar(texto, porId): Combo | null`, `useCombo()`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/engine/serializacao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { desserializar, serializar } from "./serializacao.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (id: string, slot: string) =>
  ({ id, slot, name: id } as unknown as Peca);

const CATALOGO = [peca("aaa", "blade"), peca("bbb", "ratchet"), peca("ccc", "bit")];
const porId = (id: string) => CATALOGO.find((p) => p.id === id) ?? null;

describe("combo na querystring", () => {
  it("serializa anatomia e ids na ordem dos slots", () => {
    const c: Combo = { anatomy: "basic",
      pecas: { blade: CATALOGO[0]!, ratchet: CATALOGO[1]!, bit: CATALOGO[2]! } };
    expect(serializar(c)).toBe("basic:blade=aaa,ratchet=bbb,bit=ccc");
  });

  it("combo incompleto serializa só o que tem", () => {
    expect(serializar({ anatomy: "basic", pecas: { blade: CATALOGO[0]! } }))
      .toBe("basic:blade=aaa");
  });

  it("combo vazio serializa só a anatomia", () => {
    expect(serializar({ anatomy: "basic", pecas: {} })).toBe("basic:");
  });

  it("ida e volta preserva o combo", () => {
    const c: Combo = { anatomy: "unique_expand",
      pecas: { blade: CATALOGO[0]! } };
    expect(desserializar(serializar(c), porId)).toEqual(c);
  });

  it("id que não existe mais no catálogo é ignorado, e o resto sobrevive", () => {
    const r = desserializar("basic:blade=aaa,ratchet=sumiu", porId);
    expect(r?.pecas.blade?.id).toBe("aaa");
    expect(r?.pecas.ratchet).toBeUndefined();
  });

  it("anatomia desconhecida devolve nulo", () => {
    expect(desserializar("inventada:blade=aaa", porId)).toBeNull();
  });

  it("texto malformado devolve nulo em vez de estourar", () => {
    expect(desserializar("", porId)).toBeNull();
    expect(desserializar("sem-dois-pontos", porId)).toBeNull();
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/serializacao.test.ts`
Esperado: FALHA — `Cannot find module './serializacao.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/engine/serializacao.ts`:

```ts
import { ANATOMIAS_CONHECIDAS, slotsDe } from "./slots.ts";
import type { Anatomy, Combo, PartSlot, Peca } from "./types.ts";

/**
 * Combo em texto, para viver na querystring: `basic:blade=aaa,ratchet=bbb`.
 *
 * Formato legível de propósito — quem compartilha um link deve conseguir ver o
 * que está compartilhando. Os ids são os do catálogo; um id que suma numa
 * revisão do catálogo é ignorado na volta, e o resto do combo sobrevive.
 */
export function serializar(combo: Combo): string {
  const partes = slotsDe(combo.anatomy)
    .map((slot) => [slot, combo.pecas[slot]] as const)
    .filter((par): par is [PartSlot, Peca] => Boolean(par[1]))
    .map(([slot, peca]) => `${slot}=${peca.id}`);
  return `${combo.anatomy}:${partes.join(",")}`;
}

export function desserializar(
  texto: string, porId: (id: string) => Peca | null,
): Combo | null {
  const corte = texto.indexOf(":");
  if (corte < 0) return null;

  const anatomy = texto.slice(0, corte) as Anatomy;
  if (!ANATOMIAS_CONHECIDAS.includes(anatomy)) return null;

  const validos = slotsDe(anatomy);
  const pecas: Combo["pecas"] = {};
  for (const par of texto.slice(corte + 1).split(",")) {
    if (!par) continue;
    const [slot, id] = par.split("=") as [PartSlot, string];
    if (!validos.includes(slot) || !id) continue;
    const peca = porId(id);
    // peça só entra no slot que ela mesma declara: link adulterado não produz
    // combo impossível, produz combo incompleto
    if (peca && peca.slot === slot) pecas[slot] = peca;
  }
  return { anatomy, pecas };
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/serializacao.test.ts`
Esperado: PASSA, 7 testes.

- [ ] **Passo 5: criar o hook**

Crie `src/hooks/useCombo.ts`:

```ts
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { desserializar, serializar } from "../lib/engine/serializacao.ts";
import type { Anatomy, Combo, PartSlot, Peca } from "../lib/engine/types.ts";

/**
 * O combo em montagem, guardado na querystring.
 *
 * Na URL e não em estado local porque o link tem de ser compartilhável
 * (spec §3.2) e sobreviver a um recarregamento. `replace: true` evita encher o
 * histórico do navegador a cada peça trocada — o botão voltar deve sair do
 * laboratório, não desfazer escolha por escolha.
 */
export function useCombo(catalogo: Peca[], anatomiaPadrao: Anatomy = "basic") {
  const [params, setParams] = useSearchParams();

  const porId = useCallback(
    (id: string) => catalogo.find((p) => p.id === id) ?? null,
    [catalogo],
  );

  const combo: Combo = useMemo(() => {
    const bruto = params.get("combo");
    return (bruto && desserializar(bruto, porId)) ?? { anatomy: anatomiaPadrao, pecas: {} };
  }, [params, porId, anatomiaPadrao]);

  const gravar = useCallback((novo: Combo) => {
    const p = new URLSearchParams(params);
    p.set("combo", serializar(novo));
    setParams(p, { replace: true });
  }, [params, setParams]);

  const porSlot = useCallback((slot: PartSlot, peca: Peca | null) => {
    const pecas = { ...combo.pecas };
    if (peca) pecas[slot] = peca;
    else delete pecas[slot];
    gravar({ ...combo, pecas });
  }, [combo, gravar]);

  // Trocar de anatomia descarta as peças em slots que a nova não tem.
  const trocarAnatomia = useCallback((anatomy: Anatomy) => {
    gravar({ anatomy, pecas: combo.pecas });
  }, [combo.pecas, gravar]);

  return { combo, porSlot, trocarAnatomia };
}
```

- [ ] **Passo 6: commitar**

```bash
npm test && npx tsc --noEmit
git add src/lib/engine/ src/hooks/useCombo.ts
git commit -m "feat(lab): combo serializado na querystring"
```

---

## Task 8: A tela do laboratório

**Arquivos:**
- Criar: `src/components/SeletorPeca.tsx`
- Criar: `src/components/Laboratorio.tsx`
- Modificar: `src/main.tsx:30` (rota `/lab`)
- Modificar: `src/App.tsx` (link no cabeçalho)

**Interfaces:**
- Consome: tudo do motor (Tasks 1–7), `useCatalog` e `useCombo`
- Produz: rota `/lab`

- [ ] **Passo 1: expor as peças do catálogo**

`useCatalog` hoje devolve composições, não peças soltas. O laboratório precisa da lista de peças para o seletor e para o denominador. Em `src/hooks/useCatalog.ts`, acrescente ao retorno:

```ts
  // Peças únicas do catálogo, para o seletor do laboratório e para o
  // denominador das barras (spec §5.4). Vêm das composições já carregadas:
  // uma consulta a mais só para isso seria desperdício.
  const pecas = useMemo(() => {
    const vistas = new Map<string, Part>();
    for (const c of composicoes) for (const { part } of c.pecas) vistas.set(part.id, part);
    return [...vistas.values()];
  }, [composicoes]);

  return { composicoes, pecas, totalProdutos, error, loading };
```

Importe `useMemo` de `react` no topo do arquivo.

- [ ] **Passo 2: criar o seletor de peça**

Crie `src/components/SeletorPeca.tsx`:

```tsx
import { useState } from "react";
import { T } from "../theme.ts";
import { ROTULO_SLOT } from "./rotulos.ts";
import { casaTermos, termosDaBusca } from "../lib/busca.ts";
import type { PartSlot, Peca } from "../lib/engine/types.ts";

/**
 * Escolha de peça para um slot.
 *
 * Lista só peças do slot pedido — o motor recusaria as outras, e oferecer o que
 * não pode ser escolhido é convidar ao erro. A busca reusa `casaTermos`, então
 * "catraca" e "ratchet" funcionam aqui como no catálogo.
 */
export default function SeletorPeca({
  slot, pecas, escolhida, aoEscolher,
}: {
  slot: PartSlot;
  pecas: Peca[];
  escolhida: Peca | undefined;
  aoEscolher: (peca: Peca | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const candidatas = pecas.filter((p) => p.slot === slot);
  const termos = termosDaBusca(busca);
  const filtradas = candidatas.filter((p) => casaTermos(p.name, termos));

  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 9, padding: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: T.textSecondary }}>{ROTULO_SLOT[slot]}</strong>
        {escolhida && (
          <button onClick={() => aoEscolher(null)}
                  style={{ background: "none", border: "none", color: T.textMuted,
                           fontSize: 12, cursor: "pointer" }}>
            limpar
          </button>
        )}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={`Buscar ${ROTULO_SLOT[slot].toLowerCase()}…`}
        style={{
          width: "100%", boxSizing: "border-box", background: T.bgInput,
          color: T.textPrimary, border: `1px solid ${T.border}`, borderRadius: 7,
          padding: "6px 9px", fontSize: 13, outline: "none", marginBottom: 8,
        }}
      />

      <div style={{ maxHeight: 190, overflowY: "auto", display: "grid", gap: 4 }}>
        {filtradas.map((p) => (
          <button
            key={p.id}
            onClick={() => aoEscolher(p)}
            style={{
              textAlign: "left", cursor: "pointer", borderRadius: 6,
              padding: "6px 9px", fontSize: 13,
              background: escolhida?.id === p.id ? `${T.accent}22` : "transparent",
              border: `1px solid ${escolhida?.id === p.id ? T.accent : "transparent"}`,
              color: escolhida?.id === p.id ? T.accent : T.textSecondary,
            }}
          >
            {p.name}
            <span style={{ color: T.textMuted, marginLeft: 8, fontSize: 11.5 }}>
              ATQ {p.attack} · DEF {p.defense} · RES {p.stamina}
            </span>
          </button>
        ))}
        {!filtradas.length && (
          <p style={{ color: T.textMuted, fontSize: 12.5, margin: 4 }}>Nada encontrado.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Passo 3: criar a tela**

Crie `src/components/Laboratorio.tsx`:

```tsx
import { useMemo } from "react";
import { T } from "../theme.ts";
import { useCatalog, somaBruta } from "../hooks/useCatalog.ts";
import { useCombo } from "../hooks/useCombo.ts";
import SeletorPeca from "./SeletorPeca.tsx";
import { ROTULO_SLOT, ROTULO_TIPO, COR_TIPO } from "./rotulos.ts";
import { slotsDe } from "../lib/engine/slots.ts";
import { validar } from "../lib/engine/compatibility.ts";
import { agregar } from "../lib/engine/stats.ts";
import { derivarContexto, normalizar } from "../lib/engine/normalization.ts";
import { classificar } from "../lib/engine/archetype.ts";
import { contribuicoes } from "../lib/engine/explain.ts";
import { DESCONHECIDO } from "../lib/engine/types.ts";

const ATRIBUTOS = [
  ["attack", "Ataque", COR_TIPO.attack],
  ["defense", "Defesa", COR_TIPO.defense],
  ["stamina", "Resistência", COR_TIPO.stamina],
] as const;

export default function Laboratorio() {
  const { composicoes, pecas, loading, error } = useCatalog();
  const { combo, porSlot } = useCombo(pecas);

  // O denominador vem do catálogo INTEIRO (spec §5.4), e os quartis, dos beys
  // de fábrica — a referência que o usuário tem na mão.
  const contexto = useMemo(() => {
    const beys = composicoes.flatMap((c) =>
      c.lancamentos.map(() => {
        const s = somaBruta(c.pecas);
        return { pesoTotal: s.weight_g, parcial: s.pesoParcial };
      }),
    );
    return derivarContexto(pecas, beys);
  }, [pecas, composicoes]);

  const validade = validar(combo);
  const atributos = agregar(combo);
  const arquetipo = classificar(atributos, contexto, combo.anatomy);
  const parcelas = contribuicoes(combo);
  const max = contexto.maximos[combo.anatomy];

  if (loading) return <p style={{ color: T.textMuted }}>Carregando catálogo…</p>;
  if (error) return <p style={{ color: T.danger }}>Erro ao ler o banco: {error}</p>;

  return (
    <section>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Laboratório</h2>
      <p style={{ color: T.textMuted, fontSize: 13, margin: "0 0 16px" }}>
        Monte uma combinação e veja o que esperar dela. O link guarda a montagem.
      </p>

      <div style={{
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {slotsDe(combo.anatomy).map((slot) => (
            <SeletorPeca
              key={slot}
              slot={slot}
              pecas={pecas}
              escolhida={combo.pecas[slot]}
              aoEscolher={(p) => porSlot(slot, p)}
            />
          ))}
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div style={{
            background: T.bgCard, border: `1px solid ${T.border}`,
            borderRadius: 9, padding: 14,
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{
                background: `${T.accent}22`, color: T.accent, border: `1px solid ${T.accent}`,
                borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
              }}>{arquetipo.rotulo}</span>
              {arquetipo.qualificadores.map((q) => (
                <span key={q} style={{
                  border: `1px solid ${T.border}`, color: T.textSecondary,
                  borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
                }}>{q}</span>
              ))}
            </div>

            {ATRIBUTOS.map(([chave, rotulo, cor]) => {
              const pct = normalizar(atributos[chave], max[chave]);
              return (
                <div key={chave} style={{
                  display: "flex", alignItems: "center", gap: 9, marginBottom: 7,
                }}>
                  <span style={{ width: 88, fontSize: 12.5, color: T.textSecondary }}>
                    {rotulo}
                  </span>
                  <span style={{ flex: 1, height: 7, background: T.bgInput, borderRadius: 4 }}>
                    <span style={{
                      display: "block", height: "100%", width: `${pct}%`,
                      background: cor, borderRadius: 4,
                    }} />
                  </span>
                  <span style={{ width: 62, textAlign: "right", fontSize: 12.5 }}>
                    {atributos[chave]}
                    <span style={{ color: T.textMuted }}> · {pct}%</span>
                  </span>
                </div>
              );
            })}

            <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 10 }}>
              Peso {atributos.weight_g.toFixed(1)} g{atributos.pesoParcial && "*"}
              {" · "}Altura {atributos.height_mm === DESCONHECIDO
                ? "desconhecida" : `${atributos.height_mm} mm`}
              {" · "}Burst {atributos.burst_resistance === DESCONHECIDO
                ? "desconhecido" : atributos.burst_resistance}
            </p>
          </div>

          {validade.estado === "incompleto" && (
            <p style={{ color: T.warn, fontSize: 13 }}>
              Faltam: {validade.faltando.map((s) => ROTULO_SLOT[s]).join(", ")}.
              Os números acima são parciais.
            </p>
          )}

          {parcelas.length > 0 && (
            <div style={{
              background: T.bgCard, border: `1px solid ${T.border}`,
              borderRadius: 9, padding: 14,
            }}>
              <strong style={{ fontSize: 13 }}>De onde vem cada número</strong>
              {parcelas.map((c) => (
                <div key={c.slot} style={{ marginTop: 9, fontSize: 12.5 }}>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>{ROTULO_SLOT[c.slot]}</div>
                  <div>{c.peca.name}</div>
                  <div style={{ display: "flex", gap: 11, marginTop: 3, fontSize: 11.5 }}>
                    <span style={{ color: COR_TIPO.attack }}>ATQ {c.attack}</span>
                    <span style={{ color: COR_TIPO.defense }}>DEF {c.defense}</span>
                    <span style={{ color: COR_TIPO.stamina }}>RES {c.stamina}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 20, lineHeight: 1.6 }}>
        As barras vão de 0 a 100 sobre o máximo teórico da anatomia — a melhor peça do
        catálogo em cada slot, somadas. Os números à esquerda são a soma bruta dos
        atributos das peças. {ROTULO_TIPO.balance} é o resultado quando nenhum atributo
        se destaca por 15 pontos.
      </p>
    </section>
  );
}
```

- [ ] **Passo 4: registrar a rota e o link**

Em `src/main.tsx`, junto às outras rotas:

```tsx
              <Route path="/lab" element={<Laboratorio />} />
```

com `import Laboratorio from "./components/Laboratorio.tsx";` no topo.

Em `src/App.tsx`, acrescente o link ao cabeçalho, ao lado de "Fontes e créditos":

```tsx
<Link to="/lab" style={{ color: T.accentDim, fontSize: 13 }}>Laboratório</Link>
```

- [ ] **Passo 5: verificar no navegador**

```bash
npm run dev
```

Abra `http://localhost:5173/lab` e confira:
- escolher uma lâmina muda as barras e o arquétipo na hora
- a querystring vira `?combo=basic:blade=<id>`
- recarregar a página mantém a montagem
- com um slot vazio, aparece "Faltam: Catraca, Ponta"
- a soma das parcelas em "De onde vem cada número" bate com o total

- [ ] **Passo 6: commitar**

```bash
npm test && npx tsc --noEmit && npm run build
git add -A
git commit -m "feat(lab): tela de montagem com analise em tempo real"
```

---

## Task 9: Peça que falta → wishlist

O laboratório serve para planejar o que comprar. Quando o usuário monta um combo com peça que não tem, a tela precisa dizer isso e oferecer o caminho.

**Arquivos:**
- Criar: `src/lib/engine/posse.ts`
- Criar: `src/lib/engine/posse.test.ts`
- Modificar: `src/components/Laboratorio.tsx`

**Interfaces:**
- Consome: `Combo`, `PartSlot` da Task 2; estoque de `InventarioContext`
- Produz: `faltaNoInventario(combo, estoque): PartSlot[]`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/engine/posse.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { faltaNoInventario } from "./posse.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (id: string, slot: string) => ({ id, slot, name: id } as unknown as Peca);

const COMBO: Combo = {
  anatomy: "basic",
  pecas: { blade: peca("a", "blade"), ratchet: peca("b", "ratchet"), bit: peca("c", "bit") },
};

describe("o que falta no inventário", () => {
  it("nada falta quando o estoque cobre tudo", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1], ["b", 1], ["c", 1]]))).toEqual([]);
  });

  it("aponta o slot da peça que não está no estoque", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1]]))).toEqual(["ratchet", "bit"]);
  });

  it("quantidade zero conta como falta", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1], ["b", 0], ["c", 1]]))).toEqual(["ratchet"]);
  });

  it("slot vazio não conta como falta: não foi escolhido ainda", () => {
    const parcial: Combo = { anatomy: "basic", pecas: { blade: peca("a", "blade") } };
    expect(faltaNoInventario(parcial, new Map())).toEqual(["blade"]);
  });

  it("estoque vazio faz tudo faltar", () => {
    expect(faltaNoInventario(COMBO, new Map())).toEqual(["blade", "ratchet", "bit"]);
  });

  /**
   * Duas peças iguais no mesmo combo é impossível — cada slot leva uma peça e
   * os slots são distintos —, então quantidade 1 basta para qualquer combo.
   */
  it("uma unidade basta", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1], ["b", 1], ["c", 1]]))).toEqual([]);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/engine/posse.test.ts`
Esperado: FALHA — `Cannot find module './posse.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/engine/posse.ts`:

```ts
import { slotsDe } from "./slots.ts";
import type { Combo, PartSlot } from "./types.ts";

/**
 * Slots do combo cuja peça o usuário não tem.
 *
 * O estoque vem da view `user_parts` (spec §4.9), que já soma as cópias e
 * resolve equivalência Hasbro→Takara Tomy. Slot ainda vazio não entra: não
 * escolher não é o mesmo que não ter.
 *
 * Quantidade 1 basta para qualquer combo, porque cada slot leva uma peça e os
 * slots são distintos — a mesma peça não pode ocupar dois lugares.
 */
export function faltaNoInventario(
  combo: Combo, estoque: Map<string, number>,
): PartSlot[] {
  return slotsDe(combo.anatomy).filter((slot) => {
    const peca = combo.pecas[slot];
    return peca ? (estoque.get(peca.id) ?? 0) < 1 : false;
  });
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/engine/posse.test.ts`
Esperado: PASSA, 6 testes.

- [ ] **Passo 5: mostrar na tela**

Em `src/components/Laboratorio.tsx`, importe o contexto de inventário e a nova função, e acrescente o bloco depois do aviso de "Faltam:".

```tsx
import { useInventario } from "../hooks/InventarioContext.tsx";
import { faltaNoInventario } from "../lib/engine/posse.ts";
```

```tsx
          {usuario && semNoInventario.length > 0 && (
            <div style={{
              background: `${T.warn}12`, border: `1px solid ${T.warn}40`,
              borderRadius: 9, padding: "11px 13px",
            }}>
              <strong style={{ color: T.warn, fontSize: 13 }}>
                Você ainda não tem {semNoInventario.length === 1 ? "uma peça" : "algumas peças"}
              </strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: T.textSecondary,
                           fontSize: 13, lineHeight: 1.7 }}>
                {semNoInventario.map((slot) => (
                  <li key={slot}>
                    {ROTULO_SLOT[slot]} <strong>{combo.pecas[slot]!.name}</strong> —{" "}
                    <Link to={`/peca/${combo.pecas[slot]!.id}`} style={{ color: T.accentDim }}>
                      ver onde conseguir
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
```

com, junto aos outros cálculos:

```tsx
  const { estoque, usuario } = useInventario();
  const semNoInventario = faltaNoInventario(combo, estoque);
```

> **Nota para quem executa:** confira o nome real do que `InventarioContext`
> expõe antes de escrever essa linha — `grep -n "return {" src/hooks/InventarioContext.tsx`.
> Se o estoque não vier como `Map<string, number>`, converta aqui, no
> laboratório, e não mude o contexto: a tela de inventário já depende do
> formato atual.

O link vai para a ficha da peça, que já tem "onde conseguir esta peça" — a busca inversa da Onda 1, ordenada do mais fácil para o mais raro. Não há tela nova a construir.

- [ ] **Passo 6: verificar com o inventário real**

```bash
npm run dev
```

Entre com a conta Google, monte um combo com o `Dran Sword` (que está no inventário) e uma peça que não está. Esperado: só a segunda aparece na lista, com link para a ficha.

- [ ] **Passo 7: commitar**

```bash
npm test && npx tsc --noEmit && npm run build
git add -A
git commit -m "feat(lab): aponta a peca que falta no inventario e por onde consegui-la"
```

---

## Task 10: O catálogo passa a usar o motor

`useCatalog.somaBruta` é uma antecipação provisória do motor, escrita na Onda 1 para conferir os dados na tela. Agora existe o de verdade, e manter os dois é convidar a divergirem.

**Arquivos:**
- Modificar: `src/hooks/useCatalog.ts` (remover `somaBruta`)
- Modificar: `src/components/BeyCard.tsx`, `src/components/Catalogo.tsx`, `src/components/DetalheBey.tsx`

**Interfaces:**
- Consome: `agregar` da Task 3
- Produz: nada novo — troca de implementação

- [ ] **Passo 1: achar todos os usos**

```bash
grep -rn "somaBruta" src
```

- [ ] **Passo 2: trocar por `agregar`**

Onde havia `somaBruta(c.pecas)`, passe a montar um `Combo` e chamar `agregar`:

```ts
const soma = agregar({
  anatomy: c.lancamentos[0]!.anatomy,
  pecas: Object.fromEntries(c.pecas.map((p) => [p.slot, p.part])),
});
```

Os campos `attack`, `defense`, `stamina`, `weight_g` e `pesoParcial` têm os mesmos nomes, então o resto da tela não muda.

- [ ] **Passo 3: remover `somaBruta` de `useCatalog.ts`**

Apague a função e seu comentário. Ela existia com a ressalva explícita de que o motor completo não moraria ali.

- [ ] **Passo 4: verificar que a tela não mudou**

```bash
npm test && npx tsc --noEmit && npm run dev
```

Abra o catálogo e confira num card conhecido: `Dran Sword 3-60F` deve continuar com Ataque 120, Defesa 39, Resistência 31 e 42,9 g — os mesmos números de antes da troca.

- [ ] **Passo 5: commitar**

```bash
git add -A
git commit -m "refactor: catalogo passa a usar o motor em vez da soma provisoria"
```

---

## Autorrevisão

**Cobertura da spec §5:**

| Seção | Onde |
|---|---|
| 5.1 slots por anatomia | Task 1 |
| 5.2 compatibilidade | Task 2 |
| 5.3 agregação | Task 3 |
| 5.4 normalização | Task 4 |
| 5.5 arquétipo | Task 5 |
| 5.6 transparência | Task 6 |
| 5.7 batalha | fora de escopo, onda 5 — como a spec determina |
| §9 testes do motor | Tasks 1–6 e 9, um arquivo de teste por módulo |
| §3.2 rota `/lab` com combo na querystring | Tasks 7 e 8 |

**Consistência de tipos:** `Peca`, `Combo`, `PartSlot`, `Anatomy` e `DESCONHECIDO` são definidos na Task 2 e usados com o mesmo nome em todas as seguintes. `slotsDe` (Task 1) é consumido por 2, 4, 6, 7 e 9. `Atributos` (Task 3) entra em `classificar` (Task 5). `Contexto` (Task 4) entra em `classificar` e na tela.

**Ponto que a execução precisa confirmar:** a Task 9 depende do formato do estoque em `InventarioContext`, que não reli ao escrever o plano. O passo traz a verificação e a instrução de converter no laboratório em vez de mexer no contexto.

---

## O que NÃO está aqui

A **porta de entrada** — landing page, notícias e FAQ — é o outro subsistema da Onda 3 e ganha **plano próprio**. Produz software testável sozinha, não compartilha código com o motor, e depende de decisões de conteúdo que ainda não foram tomadas (de onde vêm as notícias, quanto o FAQ cobre).

**Correção ao que registrei em 02/09:** eu havia sugerido escrever o FAQ de combinações *antes* do motor, como especificação dele. Relendo a spec §5.5, a classificação já está inteiramente especificada — o motor não depende do FAQ. E o inverso também não vale: o motor soma atributos e classifica, mas **não modela** "catraca baixa aumenta o contato" nem "ponta de borracha agarra". Esse é conhecimento de domínio que só o FAQ carrega. Os dois são independentes de verdade, e a ordem entre eles é livre.
