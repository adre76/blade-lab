import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { ORDEM_SLOT, type BeyCompleto, type Part } from "./useCatalog.ts";

/**
 * Um bey e sua composição, mais os outros produtos que vendem a MESMA
 * composição — é o que permite a tela de detalhe dizer "também vendido como
 * BX-05", coerente com o agrupamento da listagem.
 */
export function useBey(id: string | undefined) {
  const [bey, setBey] = useState<BeyCompleto | null>(null);
  const [irmaos, setIrmaos] = useState<BeyCompleto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("Bey não informado");
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error } = await supabase
        .from("beyblades")
        .select("*, beyblade_parts(slot, parts(*))")
        .eq("id", id)
        .maybeSingle();

      if (cancelado) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setError("Beyblade não encontrado");
        setLoading(false);
        return;
      }

      const normalizar = (row: typeof data): BeyCompleto => {
        const { beyblade_parts, ...b } = row;
        const pecas = (beyblade_parts ?? [])
          .filter((bp): bp is typeof bp & { parts: Part } => bp.parts !== null)
          .map((bp) => ({ slot: bp.slot, part: bp.parts }))
          .sort((a, b2) => ORDEM_SLOT.indexOf(a.slot) - ORDEM_SLOT.indexOf(b2.slot));
        return { ...b, pecas } as BeyCompleto;
      };

      const atual = normalizar(data);
      setBey(atual);

      // Outros produtos com a mesma composição: mesma marca, mesmo conjunto de
      // part_id. O filtro final é no cliente porque comparar conjuntos é mais
      // simples aqui do que numa consulta.
      const { data: candidatos } = await supabase
        .from("beyblades")
        .select("*, beyblade_parts(slot, parts(*))")
        .eq("brand", atual.brand)
        .eq("anatomy", atual.anatomy)
        .neq("id", atual.id);

      if (cancelado) return;

      const assinatura = (b: BeyCompleto) =>
        b.pecas.map((p) => p.part.id).sort().join("|");
      const alvo = assinatura(atual);

      setIrmaos(
        (candidatos ?? [])
          .map(normalizar)
          .filter((b) => assinatura(b) === alvo)
          .sort((a, b) => a.release_code.localeCompare(b.release_code)),
      );
      setLoading(false);
    })();

    return () => {
      cancelado = true;
    };
  }, [id]);

  return { bey, irmaos, error, loading };
}
