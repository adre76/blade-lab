import { slotsDe } from "./slots.ts";
import type { Combo, PartSlot, Peca } from "./types.ts";

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

  for (const [slot, peca] of Object.entries(combo.pecas) as [PartSlot, Peca | undefined][]) {
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
