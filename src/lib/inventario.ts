import type { Database } from "../types/database.ts";

type Status = Database["public"]["Enums"]["inventory_status"];

/** O que o usuário marcou para um bey. `nenhum` = não há registro. */
export type EstadoInventario = "nenhum" | Status;

export type Operacao =
  | { tipo: "nada" }
  | { tipo: "inserir"; status: Status; quantidade: number }
  | { tipo: "atualizar"; status: Status; quantidade: number }
  | { tipo: "remover" };

/**
 * Decide a operação no banco a partir do estado atual e do desejado.
 *
 * Isolada do hook porque é onde o erro dói. O banco impõe
 * `unique (profile_id, beyblade_id)`: **posse e desejo são o mesmo registro**
 * com `status` diferente, não dois registros. Tratar "adicionar à wishlist"
 * como `insert` — que é o que o nome sugere — estoura violação de constraint
 * para quem já tinha o bey marcado como possuído.
 *
 * A quantidade é normalizada aqui pelos dois `check` da tabela: `quantity > 0`
 * sempre, e exatamente 1 quando o status é `wishlist` (spec §4.5 — quantidade
 * não tem significado em algo que você ainda não tem).
 */
export function decidirOperacao(
  atual: EstadoInventario,
  desejado: EstadoInventario,
  quantidade: number,
): Operacao {
  const qtd = desejado === "wishlist" ? 1 : Math.max(1, Math.floor(quantidade));

  if (desejado === "nenhum") {
    return atual === "nenhum" ? { tipo: "nada" } : { tipo: "remover" };
  }

  if (atual === "nenhum") {
    return { tipo: "inserir", status: desejado, quantidade: qtd };
  }

  // Já existe registro: nunca inserir. Wishlist -> wishlist não muda nada,
  // porque a quantidade lá é sempre 1.
  if (atual === desejado && desejado === "wishlist") return { tipo: "nada" };

  return { tipo: "atualizar", status: desejado, quantidade: qtd };
}
