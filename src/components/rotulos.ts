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
 * Os slots da Custom Line entram traduzidos nesta onda: agora que a CX está
 * no catálogo, alguém consegue ver a peça e a tradução deixa de ser decisão
 * no escuro.
 */
export const ROTULO_SLOT: Record<Enums["part_slot"], string> = {
  blade: "Lâmina",
  // O nome longo é o que a peça é: uma lâmina com a catraca embutida. Chamá-la
  // só de "Lâmina" faria o card de um UX Expand Blade parecer um bey a que
  // falta a catraca.
  integrated_blade: "Lâmina c/ catraca",
  ratchet: "Catraca",
  bit: "Ponta",
  // A ponta que traz a catraca: espelho de baixo da lâmina c/ catraca.
  integrated_bit: "Ponta c/ catraca",
  lock_chip: "Trava",
  main_blade: "Lâmina principal",
  metal_blade: "Lâmina de metal",
  over_blade: "Lâmina superior",
  assist_blade: "Lâmina auxiliar",
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
  integrated_bit: ["ponta com catraca", "ratchet-integrated bit", "combo ratchet-bit"],
  lock_chip: ["trava", "lock chip"],
  main_blade: ["lâmina principal", "main blade", "primary blade"],
  metal_blade: ["lâmina de metal", "metal blade"],
  over_blade: ["lâmina superior", "over blade"],
  assist_blade: ["lâmina auxiliar", "assist blade", "auxiliary blade"],
};

/**
 * Slots cuja classe de peça não tem atributos.
 *
 * O infobox do Lock Chip traz os campos de ataque, defesa e resistência
 * VAZIOS — verificado nas 28 páginas —, e a peça também não tem tipo. Ele
 * prende a lâmina principal na auxiliar; não é ponto de contato.
 *
 * Mostrar "0 · 0 · 0" seria dizer "peça ruim". Ele não é ruim, é de outra
 * natureza — e um catálogo que mostra o número certo com o sentido errado erra
 * do mesmo jeito. O peso continua aparecendo, porque é medida de verdade.
 *
 * Mora aqui, e não no motor: o motor soma zero corretamente e não precisa
 * saber disso. É regra de como se conta a coisa ao leitor.
 */
export const SLOTS_SEM_PONTUACAO: readonly Enums["part_slot"][] = ["lock_chip"];

/**
 * Nome de cada anatomia pela COMPOSIÇÃO, e não pela linha de produto.
 *
 * `basic` e `unique` exigem os mesmos três slots, então o laboratório mostra
 * uma opção só para as duas — e o rótulo dessa opção não pode dizer "Basic
 * Line", porque estaria nomeando a linha errada metade das vezes. Nomear pelo
 * que a montagem É resolve isso e continua verdadeiro quando a CX chegar.
 */
export const ROTULO_ANATOMIA: Record<Enums["anatomy"], string> = {
  basic: "Lâmina de uma peça",
  unique: "Lâmina de uma peça",
  unique_expand: "Lâmina com catraca integrada",
  custom: "Custom Line",
  custom_expand: "Custom Line — Expand",
  custom_integrated: "Custom Line — ponta com catraca",
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
