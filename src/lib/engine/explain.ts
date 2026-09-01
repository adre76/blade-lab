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
 * apresentação, aplicando o mesmo denominador ao total e às parcelas — se cada
 * parcela fosse normalizada aqui, os arredondamentos não fechariam.
 *
 * A ordem é a da anatomia, da lâmina para a ponta, e não a de inserção: a tela
 * lê de cima para baixo como a peça é montada.
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
