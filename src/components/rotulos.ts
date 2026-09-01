import { T } from "../theme.ts";
import type { Database } from "../types/database.ts";

type Enums = Database["public"]["Enums"];

/**
 * Tradução dos valores do banco para a interface.
 *
 * Os dados são gravados em inglês e exibidos em pt-BR (spec §2). Este é o
 * único lugar onde essa tradução acontece — três telas dependem dela, e
 * duplicá-la levaria a "Random Booster" numa tela e "Booster Aleatório" noutra.
 */

export const COR_TIPO: Record<Enums["bey_type"], string> = {
  attack: T.typeAttack,
  defense: T.typeDefense,
  stamina: T.typeStamina,
  balance: T.typeBalance,
};

export const ROTULO_TIPO: Record<Enums["bey_type"], string> = {
  attack: "Ataque",
  defense: "Defesa",
  // "Resistência", e não "Stamina": é o termo que a Hasbro usou em português, e
  // deixar um dos quatro em inglês no meio de Ataque, Defesa e Equilíbrio ficava
  // estranho. Não confundir com a "resistência a burst" da ficha de peça, que é
  // outra coisa — aquela aparece sempre por extenso, e num bloco separado.
  stamina: "Resistência",
  balance: "Equilíbrio",
};

export const MARCA: Record<Enums["brand"], { rotulo: string; cor: string }> = {
  takara_tomy: { rotulo: "Takara Tomy", cor: T.accentDim },
  hasbro: { rotulo: "Hasbro", cor: T.accentWarm },
};

export const ROTULO_RARIDADE: Record<Enums["rarity"], string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  very_rare: "Muito raro",
  exclusive: "Exclusivo",
};

/**
 * Uma escala só, do apagado ao quente, para a raridade ser lida sem depender de
 * ler a palavra. Comum fica em cinza de propósito: é a maior parte do catálogo,
 * e colorir tudo faria o destaque perder o sentido.
 */
export const COR_RARIDADE: Record<Enums["rarity"], string> = {
  common: T.textMuted,
  uncommon: T.accentDim,
  rare: T.warn,
  very_rare: T.accentWarm,
  exclusive: T.danger,
};

export const ROTULO_SLOT: Record<Enums["part_slot"], string> = {
  blade: "Lâmina",
  // O nome longo é o que a peça é: uma lâmina com o ratchet embutido. Chamá-la
  // só de "Lâmina" faria o card de um UX Expand Blade parecer um bey a que
  // falta o ratchet.
  integrated_blade: "Lâmina c/ ratchet",
  ratchet: "Ratchet",
  bit: "Bit",
  lock_chip: "Lock Chip",
  main_blade: "Main Blade",
  metal_blade: "Metal Blade",
  over_blade: "Over Blade",
  assist_blade: "Assist Blade",
};

export const ROTULO_LANCAMENTO: Record<Enums["release_type"], string> = {
  starter: "Starter",
  booster: "Booster",
  random_booster: "Random Booster",
  deck_set: "Deck Set",
  custom_set: "Custom Set",
  limited: "Limitado",
  event_exclusive: "Exclusivo de evento",
  other: "Outro",
};

export const ROTULO_RESISTENCIA: Record<Enums["resistance"], string> = {
  very_low: "Muito baixa",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  very_high: "Muito alta",
};

export const ROTULO_GIRO: Record<Enums["spin_direction"], string> = {
  right: "Horário",
  left: "Anti-horário",
  dual: "Ambos",
};

export const ROTULO_LINHA: Record<Enums["product_line"], string> = {
  BX: "BX — Basic Line",
  UX: "UX — Unique Line",
  CX: "CX — Custom Line",
};
