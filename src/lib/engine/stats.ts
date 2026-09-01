import { DESCONHECIDO } from "./types.ts";
import type { Combo, Desconhecido, PartSlot, Peca, Resistance, SpinDirection } from "./types.ts";

/** Escala ordinal de `resistance` (spec §5.3), para poder tirar o mínimo. */
export const ORDINAL_RESISTENCIA: Record<Resistance, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};

const POR_ORDINAL = Object.entries(ORDINAL_RESISTENCIA).reduce<Record<number, Resistance>>(
  (acc, [k, v]) => ({ ...acc, [v]: k as Resistance }),
  {},
);

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
