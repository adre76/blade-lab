import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../types/database.ts";

type Tabelas = Database["public"]["Tables"];
export type Part = Tabelas["parts"]["Row"];
export type Beyblade = Tabelas["beyblades"]["Row"];
export type PartSlot = Database["public"]["Enums"]["part_slot"];

/** Um bey de fábrica com as peças que o compõem, já resolvidas. */
export type BeyCompleto = Beyblade & {
  pecas: { slot: PartSlot; part: Part }[];
};

/**
 * Soma bruta dos atributos das peças (spec §5.3).
 *
 * Esta é uma antecipação deliberada e mínima do motor da onda 3: serve para
 * conferir se os dados curados fazem sentido olhando a tela. O motor completo
 * — normalização, arquétipo, contribuição por peça — não mora aqui.
 */
export function somaBruta(bey: BeyCompleto) {
  return bey.pecas.reduce(
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

export function useCatalog() {
  const [beys, setBeys] = useState<BeyCompleto[]>([]);
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
          const ordemSlot: PartSlot[] = [
            "lock_chip", "main_blade", "metal_blade", "over_blade",
            "assist_blade", "blade", "ratchet", "bit",
          ];
          const normalizado = (data ?? []).map((row) => {
            const { beyblade_parts, ...bey } = row;
            const pecas = (beyblade_parts ?? [])
              .filter((bp): bp is typeof bp & { parts: Part } => bp.parts !== null)
              .map((bp) => ({ slot: bp.slot, part: bp.parts }))
              .sort((a, b) => ordemSlot.indexOf(a.slot) - ordemSlot.indexOf(b.slot));
            return { ...bey, pecas } as BeyCompleto;
          });
          setBeys(normalizado);
        }
        setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return { beys, error, loading };
}
