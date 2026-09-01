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
