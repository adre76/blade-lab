import { normalizar } from "./normalization.ts";
import { ORDINAL_RESISTENCIA } from "./stats.ts";
import { DESCONHECIDO } from "./types.ts";
import type { Contexto } from "./normalization.ts";
import type { Atributos } from "./stats.ts";
import type { Anatomy, BeyType } from "./types.ts";

/** Folga mínima, em pontos normalizados, para o arquétipo ser puro (spec §5.5). */
const FOLGA_PURO = 15;

/**
 * Os três atributos que se medem.
 *
 * `balance` fica de fora porque não é um atributo: é o RESULTADO da
 * classificação quando nenhum dos três se destaca. Tratá-lo como os outros
 * faria o motor procurar uma coluna `balance` que não existe.
 */
type AtributoMedido = Exclude<BeyType, "balance">;

/**
 * Ordem fixa de desempate: Ataque > Defesa > Resistência.
 *
 * O `sort` do JavaScript é estável, então valores iguais preservam esta ordem —
 * é o que torna a classificação determinística e testável.
 */
const ORDEM: AtributoMedido[] = ["attack", "defense", "stamina"];

const ROTULO: Record<BeyType, string> = {
  attack: "Ataque", defense: "Defesa", stamina: "Resistência", balance: "Equilibrado",
};

export type Arquetipo = {
  /** "Ataque", "Equilibrado — Ataque/Resistência". */
  rotulo: string;
  /** Preenchido só no arquétipo puro. */
  dominante: BeyType | null;
  /** "frágil" | "resistente" | "pesado" | "leve" */
  qualificadores: string[];
};

/**
 * Classifica o combo a partir dos atributos NORMALIZADOS (spec §5.5).
 *
 * Normalizados, e não brutos, porque os três atributos têm tetos diferentes:
 * comparar ataque bruto com resistência bruta faria quase todo combo parecer
 * de ataque, já que a escala de ataque é a mais alta.
 */
export function classificar(
  atributos: Atributos, contexto: Contexto, anatomy: Anatomy,
): Arquetipo {
  const max = contexto.maximos[anatomy];
  const valores = ORDEM.map((a) => ({ atributo: a, valor: normalizar(atributos[a], max[a]) }));

  const [primeiro, segundo] = [...valores].sort((a, b) => b.valor - a.valor);

  const puro = primeiro!.valor - segundo!.valor >= FOLGA_PURO;
  const rotulo = puro
    ? ROTULO[primeiro!.atributo]
    : `Equilibrado — ${ROTULO[primeiro!.atributo]}/${ROTULO[segundo!.atributo]}`;

  const qualificadores: string[] = [];

  // Ausência de dado não é fragilidade: burst desconhecido não qualifica.
  if (atributos.burst_resistance !== DESCONHECIDO) {
    const ordinal = ORDINAL_RESISTENCIA[atributos.burst_resistance];
    if (ordinal <= 2) qualificadores.push("frágil");
    else if (ordinal >= 4) qualificadores.push("resistente");
  }

  // Peso parcial também não: o total não é o real. E peso ZERO menos ainda —
  // um combo sem peça nenhuma pesa zero, e chamá-lo de "leve" seria classificar
  // o vazio. Apareceu na primeira vez que a tela abriu.
  if (contexto.quartis && !atributos.pesoParcial && atributos.weight_g > 0) {
    if (atributos.weight_g > contexto.quartis.q3) qualificadores.push("pesado");
    else if (atributos.weight_g < contexto.quartis.q1) qualificadores.push("leve");
  }

  return { rotulo, dominante: puro ? primeiro!.atributo : null, qualificadores };
}
