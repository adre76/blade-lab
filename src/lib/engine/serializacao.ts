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
    const [slot, id] = par.split("=") as [PartSlot, string | undefined];
    if (!validos.includes(slot) || !id) continue;
    const peca = porId(id);
    // A peça só entra no slot que ela mesma declara: link adulterado não
    // produz combo impossível, produz combo incompleto.
    if (peca && peca.slot === slot) pecas[slot] = peca;
  }
  return { anatomy, pecas };
}
