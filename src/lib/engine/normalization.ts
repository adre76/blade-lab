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

  return {
    maximos,
    quartis: pesos.length >= 2
      ? { q1: quartil(pesos, 0.25), q3: quartil(pesos, 0.75) }
      : null,
  };
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
