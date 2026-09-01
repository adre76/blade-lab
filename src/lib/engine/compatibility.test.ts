import { describe, expect, it } from "vitest";
import { validar } from "./compatibility.ts";
import type { Combo, Peca } from "./types.ts";

/** Peça mínima: só o que o motor lê. O resto do Row não participa de regra. */
const peca = (slot: string, extra: Partial<Peca> = {}) =>
  ({ id: `id-${slot}`, slot, name: slot, attack: 0, defense: 0, stamina: 0,
     weight_g: null, height_mm: null, contact_points: null,
     burst_resistance: null, dash_performance: null, spin_direction: null,
     ...extra } as unknown as Peca);

const combo = (anatomy: Combo["anatomy"], pecas: Combo["pecas"]): Combo =>
  ({ anatomy, pecas });

describe("compatibilidade", () => {
  it("combo completo é válido", () => {
    const c = combo("basic", {
      blade: peca("blade"), ratchet: peca("ratchet"), bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });

  it("faltando slots é incompleto, não inválido — é o estado normal da montagem", () => {
    const c = combo("basic", { blade: peca("blade") });
    expect(validar(c)).toEqual({ estado: "incompleto", faltando: ["ratchet", "bit"] });
  });

  it("combo vazio é incompleto com todos os slots faltando", () => {
    expect(validar(combo("basic", {}))).toEqual({
      estado: "incompleto", faltando: ["blade", "ratchet", "bit"],
    });
  });

  it("peça cujo slot não bate com a posição é inválido", () => {
    const c = combo("basic", {
      blade: peca("bit"), ratchet: peca("ratchet"), bit: peca("bit"),
    });
    const r = validar(c);
    expect(r.estado).toBe("invalido");
    expect(r.estado === "invalido" && r.problemas[0]).toContain("blade");
  });

  it("slot fora da anatomia é inválido", () => {
    const c = combo("basic", {
      blade: peca("blade"), ratchet: peca("ratchet"), bit: peca("bit"),
      assist_blade: peca("assist_blade"),
    });
    const r = validar(c);
    expect(r.estado).toBe("invalido");
    expect(r.estado === "invalido" && r.problemas[0]).toContain("assist_blade");
  });

  it("slot errado tem precedência sobre slot faltando", () => {
    const c = combo("basic", { blade: peca("bit") });
    expect(validar(c).estado).toBe("invalido");
  });

  it("valida unique_expand com dois slots", () => {
    const c = combo("unique_expand", {
      integrated_blade: peca("integrated_blade"), bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });

  it("valida custom_expand com seis slots", () => {
    const c = combo("custom_expand", {
      lock_chip: peca("lock_chip"), metal_blade: peca("metal_blade"),
      over_blade: peca("over_blade"), assist_blade: peca("assist_blade"),
      ratchet: peca("ratchet"), bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });

  it("peça de outra linha é aceita: compatibilidade é por slot, não por linha", () => {
    const c = combo("custom_expand", {
      lock_chip: peca("lock_chip"), metal_blade: peca("metal_blade"),
      over_blade: peca("over_blade"), assist_blade: peca("assist_blade"),
      ratchet: peca("ratchet", { line: "BX" } as Partial<Peca>),
      bit: peca("bit"),
    });
    expect(validar(c)).toEqual({ estado: "valido" });
  });
});
