import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from "react";
import { supabase } from "../lib/supabase.ts";
import { decidirOperacao, type EstadoInventario } from "../lib/inventario.ts";
import { useAuth } from "./AuthContext.tsx";
import type { Database } from "../types/database.ts";

type Item = Database["public"]["Tables"]["inventory_items"]["Row"];

type Inventario = {
  itens: Item[];
  carregando: boolean;
  erro: string | null;
  /** Estado atual de um bey: `nenhum`, `owned` ou `wishlist`. */
  estado: (beybladeId: string) => EstadoInventario;
  /** Quantidade registrada; 0 quando não há registro. */
  quantidade: (beybladeId: string) => number;
  definir: (
    beybladeId: string,
    desejado: EstadoInventario,
    quantidade?: number,
  ) => Promise<{ erro: string | null }>;
};

const Contexto = createContext<Inventario | null>(null);

/**
 * Inventário do usuário, compartilhado entre o catálogo e a tela de inventário.
 *
 * Compartilhado de propósito: o card precisa saber o estado de cada bey para
 * desenhar o controle, e a tela precisa da lista inteira. Com hooks
 * independentes, marcar um bey no catálogo deixaria a outra tela desatualizada
 * até um recarregamento.
 */
export function InventarioProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) {
      setItens([]);
      return;
    }
    let cancelado = false;
    setCarregando(true);

    supabase
      .from("inventory_items")
      .select("*")
      .eq("profile_id", usuario.id)
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) setErro(error.message);
        else setItens(data ?? []);
        setCarregando(false);
      });

    return () => { cancelado = true; };
  }, [usuario]);

  const buscar = useCallback(
    (beybladeId: string) => itens.find((i) => i.beyblade_id === beybladeId),
    [itens],
  );

  const estado = useCallback(
    (beybladeId: string): EstadoInventario => buscar(beybladeId)?.status ?? "nenhum",
    [buscar],
  );

  const quantidade = useCallback(
    (beybladeId: string) => buscar(beybladeId)?.quantity ?? 0,
    [buscar],
  );

  const definir = useCallback(
    async (beybladeId: string, desejado: EstadoInventario, qtd = 1) => {
      if (!usuario) return { erro: "Não autenticado" };

      const atual = estado(beybladeId);
      const op = decidirOperacao(atual, desejado, qtd);
      if (op.tipo === "nada") return { erro: null };

      setErro(null);

      if (op.tipo === "remover") {
        const { error } = await supabase
          .from("inventory_items").delete()
          .eq("profile_id", usuario.id).eq("beyblade_id", beybladeId);
        if (error) { setErro(error.message); return { erro: error.message }; }
        setItens((ant) => ant.filter((i) => i.beyblade_id !== beybladeId));
        return { erro: null };
      }

      // insert e update usam o mesmo upsert: a chave natural
      // (profile_id, beyblade_id) já garante que não haja duplicata, e a
      // decisão entre um e outro é da função pura — aqui só é preciso que a
      // escrita respeite a constraint.
      const { data, error } = await supabase
        .from("inventory_items")
        .upsert(
          {
            profile_id: usuario.id,
            beyblade_id: beybladeId,
            status: op.status,
            quantity: op.quantidade,
          },
          { onConflict: "profile_id,beyblade_id" },
        )
        .select()
        .single();

      if (error) { setErro(error.message); return { erro: error.message }; }

      setItens((ant) => {
        const outros = ant.filter((i) => i.beyblade_id !== beybladeId);
        return data ? [...outros, data] : outros;
      });
      return { erro: null };
    },
    [usuario, estado],
  );

  return (
    <Contexto.Provider value={{ itens, carregando, erro, estado, quantidade, definir }}>
      {children}
    </Contexto.Provider>
  );
}

export function useInventario(): Inventario {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useInventario precisa estar dentro de <InventarioProvider>");
  return ctx;
}
