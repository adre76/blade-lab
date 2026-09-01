import type { Arquetipo } from "./archetype.ts";
import type { BeyType } from "./types.ts";

/**
 * Tendência de confronto entre TIPOS — nunca entre beys.
 *
 * Isto não é `battle.ts`. A spec §5.7 proíbe inventar fórmula de batalha, e com
 * razão: estimar quem vence exigiria calibrar contra o comportamento real das
 * peças, e nada aqui faz isso. O que este módulo faz é outra coisa, e menor:
 * repetir uma afirmação que a fonte já publica, indexada pelo arquétipo que o
 * motor calculou.
 *
 * As páginas de tipo da Beyblade Wiki fecham o triângulo nos dois sentidos:
 *
 *   Defesa      "usada como counterpick contra combos de Ataque, e fraca
 *                contra Resistência, que gira mais rápido"
 *   Resistência "vulnerável a Ataque por causa do pouco atrito e da pouca
 *                resistência a KO, mas costuma superar Defesa"
 *
 * Daí sai o terceiro lado por consequência: Ataque supera Resistência e cede
 * para Defesa.
 *
 * Nenhuma porcentagem, nenhuma simulação. Lançamento, estádio e sorte decidem
 * o resto, e a tela diz isso.
 */
const TRIANGULO: Record<Exclude<BeyType, "balance">, {
  vence: BeyType; perde: BeyType; porque: string;
}> = {
  attack: {
    vence: "stamina",
    perde: "defense",
    porque:
      "Um bey de resistência tem pouco atrito com o chão e escorrega quando é " +
      "atingido, então costuma ser jogado para fora. Já um de defesa agarra o " +
      "chão e é pesado — a batida escorrega nele, e quem ataca gasta a própria " +
      "força tentando.",
  },
  defense: {
    vence: "attack",
    perde: "stamina",
    porque:
      "Um bey de defesa aguenta a pancada sem sair do lugar, e é por isso que " +
      "costuma ser escolhido contra os de ataque. Mas ele gasta força se " +
      "firmando, e um bey de resistência gira mais tempo — se ninguém sair do " +
      "estádio, quem para primeiro perde.",
  },
  stamina: {
    vence: "defense",
    perde: "attack",
    porque:
      "Um bey de resistência gira por muito mais tempo, e ganha do de defesa " +
      "no cansaço. Mas ele toca o chão de leve justamente para gastar pouco, e " +
      "isso o faz escorregar: uma batida forte o joga para fora antes de ele " +
      "ter tempo de vencer.",
  },
};

export type Confronto = {
  /** Tipos contra os quais este arquétipo costuma se dar bem. */
  vence: BeyType[];
  /** Tipos contra os quais costuma se dar mal. */
  perde: BeyType[];
  /** Por que, em linguagem de quem está aprendendo. Nulo quando não há tendência. */
  porque: string | null;
  /** O que vale contra QUALQUER tipo. Hoje, só o que o burst diz. */
  alertas: string[];
};

const ALERTA_BURST: Record<string, string> = {
  frágil:
    "Este conjunto se desmonta com facilidade, e um Burst Finish entrega 2 " +
    "pontos ao adversário — vale contra qualquer tipo.",
  resistente:
    "Este conjunto é difícil de desmontar, então dificilmente entrega pontos " +
    "por Burst Finish.",
};

export function confrontos(arquetipo: Arquetipo): Confronto {
  const alertas = arquetipo.qualificadores
    .map((q) => ALERTA_BURST[q])
    .filter((a): a is string => Boolean(a));

  // Sem dominante o arquétipo é equilibrado, e equilibrado não tem contra quem
  // se dar bem nem mal. Inventar uma tendência aqui seria o começo exato do
  // que a spec §5.7 proíbe.
  const lado = arquetipo.dominante && arquetipo.dominante !== "balance"
    ? TRIANGULO[arquetipo.dominante]
    : null;

  return lado
    ? { vence: [lado.vence], perde: [lado.perde], porque: lado.porque, alertas }
    : { vence: [], perde: [], porque: null, alertas };
}
