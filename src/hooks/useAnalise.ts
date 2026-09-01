import { useMemo } from "react";
import { useCatalog, comboDoCatalogo } from "./useCatalog.ts";
import { agregar } from "../lib/engine/stats.ts";
import { derivarContexto } from "../lib/engine/normalization.ts";
import { classificar } from "../lib/engine/archetype.ts";
import { confrontos } from "../lib/engine/matchup.ts";
import { contribuicoes } from "../lib/engine/explain.ts";
import type { Combo } from "../lib/engine/types.ts";

/**
 * A análise completa de um combo: atributos, arquétipo, confrontos e a
 * contribuição de cada peça.
 *
 * Mora num hook porque duas telas precisam da MESMA análise — a ficha do bey
 * de fábrica e o laboratório —, e o contexto de normalização é caro de montar:
 * ele depende do catálogo inteiro (spec §5.4), e derivá-lo em dois lugares
 * convidaria os dois a divergirem no dia em que a regra mudasse.
 */
export function useAnalise(combo: Combo) {
  const { composicoes, pecas, loading, error } = useCatalog();

  /**
   * O denominador vem do catálogo INTEIRO, e os quartis de peso, dos beys de
   * fábrica — a referência que o usuário tem na mão.
   *
   * A população é por COMPOSIÇÃO, e não por produto: BX-03 e BX-05 são o mesmo
   * bey em caixas diferentes, e contá-lo duas vezes enviesaria a distribuição
   * para as composições que saíram em mais embalagens.
   */
  const contexto = useMemo(() => {
    const beys = composicoes.map((c) => {
      const s = agregar(comboDoCatalogo(c.lancamentos[0]!.anatomy, c.pecas));
      return { pesoTotal: s.weight_g, parcial: s.pesoParcial };
    });
    return derivarContexto(pecas, beys);
  }, [pecas, composicoes]);

  const atributos = agregar(combo);
  const arquetipo = classificar(atributos, contexto, combo.anatomy);

  return {
    contexto,
    atributos,
    arquetipo,
    confronto: confrontos(arquetipo),
    parcelas: contribuicoes(combo),
    pecas,
    composicoes,
    loading,
    error,
  };
}
