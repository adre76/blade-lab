import { describe, expect, it } from "vitest";
import { decidirOperacao, type EstadoInventario } from "./inventario.ts";

/**
 * As nove combinações de estado atual × estado desejado.
 *
 * Existe porque o banco impõe `unique (profile_id, beyblade_id)`: posse e
 * desejo são o MESMO registro com `status` diferente. Um `insert` onde deveria
 * ser `update` estoura violação de constraint na cara do usuário, e é
 * exatamente o erro fácil de cometer — "adicionar à wishlist" soa como inserir.
 */
describe("decidirOperacao", () => {
  const casos: Array<[EstadoInventario, EstadoInventario, string]> = [
    ["nenhum", "nenhum", "nada"],
    ["nenhum", "owned", "inserir"],
    ["nenhum", "wishlist", "inserir"],
    ["owned", "nenhum", "remover"],
    ["owned", "owned", "atualizar"],
    ["owned", "wishlist", "atualizar"],
    ["wishlist", "nenhum", "remover"],
    ["wishlist", "owned", "atualizar"],
    ["wishlist", "wishlist", "nada"],
  ];

  for (const [atual, desejado, esperado] of casos) {
    it(`${atual} -> ${desejado} = ${esperado}`, () => {
      expect(decidirOperacao(atual, desejado, 1).tipo).toBe(esperado);
    });
  }

  it("nunca insere quando já existe registro — seria violação de constraint", () => {
    for (const atual of ["owned", "wishlist"] as const) {
      for (const desejado of ["nenhum", "owned", "wishlist"] as const) {
        expect(decidirOperacao(atual, desejado, 1).tipo).not.toBe("inserir");
      }
    }
  });

  it("força quantidade 1 na wishlist — o check do banco recusa mais que isso", () => {
    const op = decidirOperacao("nenhum", "wishlist", 7);
    expect(op.tipo).toBe("inserir");
    if (op.tipo === "inserir") {
      expect(op.quantidade).toBe(1);
      expect(op.status).toBe("wishlist");
    }
  });

  it("preserva a quantidade em owned", () => {
    const op = decidirOperacao("nenhum", "owned", 3);
    if (op.tipo === "inserir") expect(op.quantidade).toBe(3);
  });

  it("recusa quantidade menor que 1 em owned — o check exige quantity > 0", () => {
    const op = decidirOperacao("nenhum", "owned", 0);
    if (op.tipo === "inserir") expect(op.quantidade).toBe(1);
  });

  it("passar de wishlist para owned mantém o registro e leva a quantidade", () => {
    const op = decidirOperacao("wishlist", "owned", 2);
    expect(op.tipo).toBe("atualizar");
    if (op.tipo === "atualizar") {
      expect(op.status).toBe("owned");
      expect(op.quantidade).toBe(2);
    }
  });
});
