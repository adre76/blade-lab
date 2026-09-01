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
 *
 * Existe como valor de primeira classe para a interface poder dizer
 * "desconhecido" em vez de exibir um número inventado (spec §5.3).
 */
export const DESCONHECIDO = "desconhecido" as const;
export type Desconhecido = typeof DESCONHECIDO;
