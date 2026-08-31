import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import type { Beyblade, Part } from "./useCatalog.ts";

/**
 * Uma peça e os beys que a contêm.
 *
 * A segunda consulta é a **busca inversa** do spec §4.9 — a mesma que o
 * laboratório usará no caminho "não tenho esta peça → qual bey comprar". A
 * ordenação segue a regra de lá: raridade crescente e lançamento decrescente,
 * ou seja, o mais fácil de achar primeiro.
 *
 * O índice `beyblade_parts_part_idx` existe desde a Onda 0 para esta consulta.
 */
export function usePeca(id: string | undefined) {
  const [peca, setPeca] = useState<Part | null>(null);
  const [beys, setBeys] = useState<Beyblade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("Peça não informada");
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error } = await supabase
        .from("parts").select("*").eq("id", id).maybeSingle();

      if (cancelado) return;
      if (error) { setError(error.message); setLoading(false); return; }
      if (!data) { setError("Peça não encontrada"); setLoading(false); return; }

      setPeca(data);

      const { data: contendo } = await supabase
        .from("beyblade_parts")
        .select("beyblades(*)")
        .eq("part_id", id);

      if (cancelado) return;

      setBeys(
        (contendo ?? [])
          .map((r) => r.beyblades)
          .filter((b): b is Beyblade => b !== null)
          .sort((a, b) => {
            const ordem = ["common", "uncommon", "rare", "very_rare", "exclusive"];
            const dif = ordem.indexOf(a.rarity) - ordem.indexOf(b.rarity);
            if (dif !== 0) return dif;
            return (b.release_date ?? "").localeCompare(a.release_date ?? "");
          }),
      );
      setLoading(false);
    })();

    return () => { cancelado = true; };
  }, [id]);

  return { peca, beys, error, loading };
}
