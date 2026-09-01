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

/**
 * Nome de cada classe de peça, em português.
 *
 * *Blade* já era *Lâmina*; deixar as outras duas em inglês fazia a ficha
 * mostrar uma traduzida e duas não. *Catraca* é a tradução literal de ratchet,
 * e *Ponta* é o que o bit é — a ponta que toca o estádio.
 *
 * Os slots da Custom Line ficam em inglês até a onda da CX: traduzir nome de
 * peça que ninguém consegue ver ainda seria decidir no escuro.
 */
export const ROTULO_SLOT: Record<Enums["part_slot"], string> = {
  blade: "Lâmina",
  // O nome longo é o que a peça é: uma lâmina com a catraca embutida. Chamá-la
  // só de "Lâmina" faria o card de um UX Expand Blade parecer um bey a que
  // falta a catraca.
  integrated_blade: "Lâmina c/ catraca",
  ratchet: "Catraca",
  bit: "Ponta",
  lock_chip: "Lock Chip",
  main_blade: "Main Blade",
  metal_blade: "Metal Blade",
  over_blade: "Over Blade",
  assist_blade: "Assist Blade",
};

/**
 * Como cada slot pode ser procurado na busca.
 *
 * A comunidade, as listas de produto e as lojas dizem "ratchet" e "bit". Se a
 * tradução tirasse esses termos da busca, ela pioraria o catálogo em vez de
 * melhorar: quem procura `bit Flat` tem de achar. Os dois idiomas indexam.
 */
export const BUSCA_SLOT: Record<Enums["part_slot"], string[]> = {
  blade: ["lâmina", "blade"],
  integrated_blade: ["lâmina com catraca", "ratchet-integrated blade", "integrated blade"],
  ratchet: ["catraca", "ratchet"],
  bit: ["ponta", "bit"],
  lock_chip: ["lock chip"],
  main_blade: ["main blade"],
  metal_blade: ["metal blade"],
  over_blade: ["over blade"],
  assist_blade: ["assist blade"],
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
