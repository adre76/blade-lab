import { slotsDe } from "./slots.ts";
import type { Combo, PartSlot } from "./types.ts";

/**
 * Slots do combo cuja peça o usuário não tem.
 *
 * O estoque vem da view `user_parts` (spec §4.9), que já soma as cópias e
 * resolve a equivalência Hasbro→Takara Tomy. Slot ainda vazio não entra: não
 * escolher não é o mesmo que não ter.
 *
 * Uma unidade basta para qualquer combo, porque cada slot leva uma peça e os
 * slots são distintos — a mesma peça não pode ocupar dois lugares.
 *
 * A ordem é a da anatomia, para a lista ler como o bey se monta.
 */
export function faltaNoInventario(
  combo: Combo, estoque: Map<string, number>,
): PartSlot[] {
  return slotsDe(combo.anatomy).filter((slot) => {
    const peca = combo.pecas[slot];
    return peca ? (estoque.get(peca.id) ?? 0) < 1 : false;
  });
}
