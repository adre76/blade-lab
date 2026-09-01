import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "./AuthContext.tsx";
import { useInventario } from "./InventarioContext.tsx";
import type { Database } from "../types/database.ts";

type PartSlot = Database["public"]["Enums"]["part_slot"];

export type LinhaEstoque = { part_id: string; slot: PartSlot; quantity: number };

/**
 * Quantas unidades de cada peça o usuário tem, derivado dos beys do inventário.
 *
 * Sai da view `user_parts` (spec §4.9), que soma as cópias e resolve a
 * equivalência Hasbro→Takara Tomy. Mora num hook porque agora são duas telas —
 * o inventário e o laboratório — e derivar a mesma regra em dois lugares é
 * convite a divergirem.
 *
 * **Sem embedding de `parts`:** o PostgREST recusa com "could not find a
 * relationship", porque uma VIEW não declara chave estrangeira e ele deriva os
 * relacionamentos das FKs. O nome de cada peça vem do catálogo, que a tela já
 * carregou.
 *
 * Depende de `itens` para recarregar quando o inventário muda: marcar um bey
 * como "tenho" muda o estoque de peças na hora seguinte.
 */
export function useEstoquePecas() {
  const { usuario } = useAuth();
  const { itens } = useInventario();
  const [linhas, setLinhas] = useState<LinhaEstoque[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!usuario) {
      setLinhas([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);

    supabase
      .from("user_parts")
      .select("part_id, slot, quantity")
      .then(({ data, error }) => {
        if (cancelado) return;
        if (!error) {
          setLinhas(
            (data ?? []).flatMap((r) =>
              r.part_id && r.slot
                ? [{ part_id: r.part_id, slot: r.slot, quantity: r.quantity ?? 0 }]
                : [],
            ),
          );
        }
        setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [usuario, itens]);

  /** part_id -> quantidade, para quem só precisa perguntar "tenho esta peça?". */
  const porId = useMemo(
    () => new Map(linhas.map((l) => [l.part_id, l.quantity])),
    [linhas],
  );

  return { linhas, porId, carregando };
}
