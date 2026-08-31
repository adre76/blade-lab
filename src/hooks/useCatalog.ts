import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../types/database.ts";

type Tabelas = Database["public"]["Tables"];
export type Part = Tabelas["parts"]["Row"];
export type Beyblade = Tabelas["beyblades"]["Row"];
export type PartSlot = Database["public"]["Enums"]["part_slot"];
export type Rarity = Database["public"]["Enums"]["rarity"];

/** Um bey de fábrica com as peças que o compõem, já resolvidas. */
export type BeyCompleto = Beyblade & {
  pecas: { slot: PartSlot; part: Part }[];
};

/**
 * Uma composição do catálogo: as mesmas peças, com todos os produtos que a
 * vendem. BX-03 (starter) e BX-05 (booster) são o mesmo "Wizard Arrow 4-80B",
 * mudando só a caixa e o lançador — listá-los separados encheria a tela de
 * pares idênticos.
 */
export type Composicao = {
  chave: string;
  nome: string;
  pecas: { slot: PartSlot; part: Part }[];
  lancamentos: BeyCompleto[];
  /** A mais fácil de achar entre os produtos que vendem esta composição. */
  raridade: Rarity;
};

/** Ordem de exibição das peças: da lâmina para a ponteira. */
export const ORDEM_SLOT: PartSlot[] = [
  "lock_chip", "main_blade", "metal_blade", "over_blade",
  "assist_blade", "blade", "ratchet", "bit",
];

/** Ordem do enum `rarity` no banco — do mais comum ao mais raro (spec §4.2). */
const ORDEM_RARIDADE: Rarity[] = ["common", "uncommon", "rare", "very_rare", "exclusive"];

/**
 * Soma bruta dos atributos das peças (spec §5.3).
 *
 * Antecipação deliberada e mínima do motor da onda 3: serve para conferir se os
 * dados curados fazem sentido olhando a tela. O motor completo — normalização,
 * arquétipo, contribuição por peça — não mora aqui.
 */
export function somaBruta(pecas: { part: Part }[]) {
  return pecas.reduce(
    (acc, { part }) => ({
      attack: acc.attack + part.attack,
      defense: acc.defense + part.defense,
      stamina: acc.stamina + part.stamina,
      weight_g: acc.weight_g + Number(part.weight_g ?? 0),
      pesoParcial: acc.pesoParcial || part.weight_g === null,
    }),
    { attack: 0, defense: 0, stamina: 0, weight_g: 0, pesoParcial: false },
  );
}

/**
 * Agrupa por marca + conjunto de peças.
 *
 * A marca entra na chave de propósito: um bey Hasbro e seu equivalente Takara
 * Tomy são produtos distintos, com nomes próprios, e juntá-los esconderia a
 * diferença que a etiqueta de marca existe para mostrar.
 */
function agrupar(beys: BeyCompleto[]): Composicao[] {
  const grupos = new Map<string, Composicao>();

  for (const bey of beys) {
    const chave = [bey.brand, ...bey.pecas.map((p) => p.part.id)].join("|");
    const existente = grupos.get(chave);

    if (existente) {
      existente.lancamentos.push(bey);
      if (ORDEM_RARIDADE.indexOf(bey.rarity) < ORDEM_RARIDADE.indexOf(existente.raridade)) {
        existente.raridade = bey.rarity;
      }
    } else {
      grupos.set(chave, {
        chave,
        nome: bey.name,
        pecas: bey.pecas,
        lancamentos: [bey],
        raridade: bey.rarity,
      });
    }
  }

  for (const g of grupos.values()) {
    g.lancamentos.sort((a, b) => a.release_code.localeCompare(b.release_code));
  }

  return [...grupos.values()].sort((a, b) =>
    (a.lancamentos[0]?.release_code ?? "").localeCompare(b.lancamentos[0]?.release_code ?? ""),
  );
}

export function useCatalog() {
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    supabase
      .from("beyblades")
      .select("*, beyblade_parts(slot, parts(*))")
      .order("release_code")
      .then(({ data, error }) => {
        if (cancelado) return;

        if (error) {
          setError(error.message);
        } else {
          const normalizado = (data ?? []).map((row) => {
            const { beyblade_parts, ...bey } = row;
            const pecas = (beyblade_parts ?? [])
              .filter((bp): bp is typeof bp & { parts: Part } => bp.parts !== null)
              .map((bp) => ({ slot: bp.slot, part: bp.parts }))
              .sort((a, b) => ORDEM_SLOT.indexOf(a.slot) - ORDEM_SLOT.indexOf(b.slot));
            return { ...bey, pecas } as BeyCompleto;
          });
          setTotalProdutos(normalizado.length);
          setComposicoes(agrupar(normalizado));
        }
        setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return { composicoes, totalProdutos, error, loading };
}
