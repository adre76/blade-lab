import { describe, expect, it } from "vitest";
import { derivarContexto, normalizar } from "./normalization.ts";
import type { Peca } from "./types.ts";

const peca = (slot: string, attack: number, defense: number, stamina: number) =>
  ({ id: `${slot}-${attack}`, slot, name: `${slot} ${attack}`,
     attack, defense, stamina } as unknown as Peca);

const CATALOGO: Peca[] = [
  peca("blade", 60, 25, 15), peca("blade", 10, 65, 25),
  peca("ratchet", 15, 9, 6), peca("ratchet", 3, 14, 13),
  peca("bit", 45, 5, 10), peca("bit", 5, 20, 40),
  peca("integrated_blade", 85, 35, 25),
];

describe("normalização", () => {
  it("o denominador é o máximo teórico da anatomia: melhor peça de cada slot", () => {
    const ctx = derivarContexto(CATALOGO, []);
    // basic = blade + ratchet + bit; ataque: 60 + 15 + 45
    expect(ctx.maximos.basic).toEqual({ attack: 120, defense: 99, stamina: 71 });
  });

  it("cada anatomia tem seu próprio denominador", () => {
    const ctx = derivarContexto(CATALOGO, []);
    // unique_expand = integrated_blade + bit; ataque: 85 + 45
    expect(ctx.maximos.unique_expand).toEqual({ attack: 130, defense: 55, stamina: 65 });
  });

  it("anatomia sem peça para nenhum slot tem denominador zero", () => {
    const ctx = derivarContexto(CATALOGO, []);
    expect(ctx.maximos.custom).toEqual({ attack: 0, defense: 0, stamina: 0 });
  });

  it("catálogo vazio não estoura", () => {
    const ctx = derivarContexto([], []);
    expect(ctx.maximos.basic).toEqual({ attack: 0, defense: 0, stamina: 0 });
    expect(ctx.quartis).toBeNull();
  });

  it("normalizar devolve 0–100 e trata denominador zero", () => {
    expect(normalizar(60, 120)).toBe(50);
    expect(normalizar(0, 120)).toBe(0);
    expect(normalizar(10, 0)).toBe(0);
  });

  it("normalizar não passa de 100 nem fica negativo", () => {
    expect(normalizar(200, 120)).toBe(100);
    expect(normalizar(-5, 120)).toBe(0);
  });

  it("os quartis de peso saem dos beys de fábrica", () => {
    const beys = [10, 20, 30, 40, 50].map((pesoTotal) => ({ pesoTotal, parcial: false }));
    const ctx = derivarContexto(CATALOGO, beys);
    expect(ctx.quartis).toEqual({ q1: 20, q3: 40 });
  });

  it("bey de peso parcial fica FORA da população: puxaria a distribuição para baixo", () => {
    const beys = [
      ...[10, 20, 30, 40, 50].map((pesoTotal) => ({ pesoTotal, parcial: false })),
      { pesoTotal: 1, parcial: true },
      { pesoTotal: 2, parcial: true },
    ];
    expect(derivarContexto(CATALOGO, beys).quartis).toEqual({ q1: 20, q3: 40 });
  });

  it("população vazia ou de um só bey não produz quartis", () => {
    expect(derivarContexto(CATALOGO, []).quartis).toBeNull();
    expect(derivarContexto(CATALOGO, [{ pesoTotal: 40, parcial: false }]).quartis).toBeNull();
  });
});
