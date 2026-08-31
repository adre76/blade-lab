import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../types/database.ts";

type Anatomy = Database["public"]["Enums"]["anatomy"];
type PartSlot = Database["public"]["Enums"]["part_slot"];

export type AnatomySlots = Partial<Record<Anatomy, PartSlot[]>>;

/** Ordem canônica de exibição: da composição mais simples para a mais completa. */
const ORDEM: Anatomy[] = ["basic", "unique", "custom", "custom_expand"];

export function useAnatomies() {
  const [anatomies, setAnatomies] = useState<AnatomySlots>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    supabase
      .from("anatomy_slots")
      .select("anatomy, slot")
      .then(({ data, error }) => {
        // Sob StrictMode do React 19 o efeito roda duas vezes em
        // desenvolvimento; sem esta guarda, sai aviso de atualização
        // de estado após desmontagem.
        if (cancelado) return;

        if (error) {
          setError(error.message);
        } else {
          const agrupado: AnatomySlots = {};
          for (const row of data ?? []) {
            (agrupado[row.anatomy] ??= []).push(row.slot);
          }
          setAnatomies(agrupado);
        }
        setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const ordenadas = ORDEM.filter((a) => anatomies[a]).map(
    (a) => [a, anatomies[a] as PartSlot[]] as const,
  );

  return { anatomies, ordenadas, error, loading };
}
