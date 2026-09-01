import { describe, expect, it } from "vitest";
import { faltaNoInventario } from "./posse.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (id: string, slot: string) => ({ id, slot, name: id } as unknown as Peca);

const COMBO: Combo = {
  anatomy: "basic",
  pecas: { blade: peca("a", "blade"), ratchet: peca("b", "ratchet"), bit: peca("c", "bit") },
};

describe("o que falta no inventário", () => {
  it("nada falta quando o estoque cobre tudo", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1], ["b", 1], ["c", 1]]))).toEqual([]);
  });

  it("aponta o slot da peça que não está no estoque", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1]]))).toEqual(["ratchet", "bit"]);
  });

  it("quantidade zero conta como falta", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1], ["b", 0], ["c", 1]]))).toEqual(["ratchet"]);
  });

  it("slot vazio não conta como falta: não escolher não é o mesmo que não ter", () => {
    const parcial: Combo = { anatomy: "basic", pecas: { blade: peca("a", "blade") } };
    expect(faltaNoInventario(parcial, new Map())).toEqual(["blade"]);
  });

  it("estoque vazio faz faltar tudo que foi escolhido", () => {
    expect(faltaNoInventario(COMBO, new Map())).toEqual(["blade", "ratchet", "bit"]);
  });

  /**
   * Duas peças iguais no mesmo combo é impossível — cada slot leva uma peça e
   * os slots são distintos —, então uma unidade basta para qualquer combo.
   */
  it("uma unidade basta", () => {
    expect(faltaNoInventario(COMBO, new Map([["a", 1], ["b", 1], ["c", 1]]))).toEqual([]);
  });

  it("a ordem é a da anatomia, para a lista ler como o bey se monta", () => {
    const foraDeOrdem: Combo = {
      anatomy: "basic",
      pecas: { bit: peca("c", "bit"), blade: peca("a", "blade") },
    };
    expect(faltaNoInventario(foraDeOrdem, new Map())).toEqual(["blade", "bit"]);
  });
});
