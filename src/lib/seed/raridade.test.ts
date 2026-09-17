import { describe, expect, it } from "vitest";
import { raridadePadraoDoTipo } from "./raridade.ts";

describe("raridadePadraoDoTipo", () => {
  it.each(["starter", "booster", "deck_set", "custom_set"] as const)(
    "%s → common, sem motivo (compra garantida)",
    (tipo) => {
      expect(raridadePadraoDoTipo(tipo)).toEqual({ rarity: "common", rarity_reason: null });
    },
  );

  it("random_booster → rare, com um motivo genérico e honesto (sorteio dentro da caixa)", () => {
    const { rarity, rarity_reason } = raridadePadraoDoTipo("random_booster");
    expect(rarity).toBe("rare");
    expect(rarity_reason).toBeTruthy();
    // Não pode conter número — inventar uma proporção seria pior que não a ter.
    expect(rarity_reason).not.toMatch(/\d/);
  });

  it.each(["limited", "event_exclusive"] as const)(
    "%s lança — sempre exige curadoria manual com o fato específico, nunca um motivo genérico",
    (tipo) => {
      expect(() => raridadePadraoDoTipo(tipo)).toThrow(/curadoria manual/);
    },
  );

  it("'other' não tem regra — lança em vez de adivinhar", () => {
    expect(() => raridadePadraoDoTipo("other")).toThrow(/sem regra/);
  });
});
