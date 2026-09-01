import { describe, expect, it } from "vitest";
import { agregar, ORDINAL_RESISTENCIA } from "./stats.ts";
import { DESCONHECIDO } from "./types.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (slot: string, extra: Partial<Peca> = {}) =>
  ({ id: `id-${slot}`, slot, name: slot, attack: 0, defense: 0, stamina: 0,
     weight_g: null, height_mm: null, contact_points: null,
     burst_resistance: null, dash_performance: null, spin_direction: null,
     ...extra } as unknown as Peca);

const basico = (pecas: Combo["pecas"]): Combo => ({ anatomy: "basic", pecas });

describe("agregação", () => {
  it("soma os três atributos de todos os slots preenchidos", () => {
    const r = agregar(basico({
      blade: peca("blade", { attack: 60, defense: 25, stamina: 15 }),
      ratchet: peca("ratchet", { attack: 15, defense: 9, stamina: 6 }),
      bit: peca("bit", { attack: 45, defense: 5, stamina: 10 }),
    }));
    expect(r.attack).toBe(120);
    expect(r.defense).toBe(39);
    expect(r.stamina).toBe(31);
  });

  it("combo vazio soma zero e não estoura", () => {
    const r = agregar(basico({}));
    expect([r.attack, r.defense, r.stamina]).toEqual([0, 0, 0]);
  });

  it("burst é o MÍNIMO entre catraca e ponta", () => {
    const r = agregar(basico({
      ratchet: peca("ratchet", { burst_resistance: "high" }),
      bit: peca("bit", { burst_resistance: "low" }),
    }));
    expect(r.burst_resistance).toBe("low");
  });

  it("slot ausente e coluna nula são o mesmo caso: quem não tem dado não entra no mínimo", () => {
    const so_catraca = agregar(basico({
      ratchet: peca("ratchet", { burst_resistance: "medium" }),
    }));
    const ponta_nula = agregar(basico({
      ratchet: peca("ratchet", { burst_resistance: "medium" }),
      bit: peca("bit", { burst_resistance: null }),
    }));
    expect(so_catraca.burst_resistance).toBe("medium");
    expect(ponta_nula.burst_resistance).toBe("medium");
  });

  it("burst é desconhecido quando ninguém contribui — e não um número inventado", () => {
    expect(agregar(basico({ blade: peca("blade") })).burst_resistance).toBe(DESCONHECIDO);
  });

  it("o Lock Chip não participa do burst: ele prende as lâminas, não a retenção", () => {
    const r = agregar({
      anatomy: "custom",
      pecas: {
        lock_chip: peca("lock_chip", { burst_resistance: "very_low" }),
        ratchet: peca("ratchet", { burst_resistance: "high" }),
        bit: peca("bit", { burst_resistance: "high" }),
      },
    });
    expect(r.burst_resistance).toBe("high");
  });

  it("altura vem da catraca, e é desconhecida sem ela", () => {
    expect(agregar(basico({ ratchet: peca("ratchet", { height_mm: 60 }) })).height_mm).toBe(60);
    expect(agregar(basico({ blade: peca("blade") })).height_mm).toBe(DESCONHECIDO);
  });

  it("na unique_expand a altura vem da lâmina com catraca integrada", () => {
    const r = agregar({
      anatomy: "unique_expand",
      pecas: { integrated_blade: peca("integrated_blade", { height_mm: 80 }) },
    });
    expect(r.height_mm).toBe(80);
  });

  it("peso nulo conta como zero e marca o total como parcial", () => {
    const r = agregar(basico({
      blade: peca("blade", { weight_g: 34.5 }),
      ratchet: peca("ratchet", { weight_g: null }),
    }));
    expect(r.weight_g).toBeCloseTo(34.5);
    expect(r.pesoParcial).toBe(true);
  });

  it("peso completo não é parcial", () => {
    const r = agregar(basico({
      blade: peca("blade", { weight_g: 34.5 }),
      ratchet: peca("ratchet", { weight_g: 6.8 }),
    }));
    expect(r.weight_g).toBeCloseTo(41.3);
    expect(r.pesoParcial).toBe(false);
  });

  it("giro vem da lâmina principal, na ordem blade → integrated → main → metal", () => {
    expect(agregar(basico({
      blade: peca("blade", { spin_direction: "left" }),
    })).spin_direction).toBe("left");

    expect(agregar({
      anatomy: "unique_expand",
      pecas: { integrated_blade: peca("integrated_blade", { spin_direction: "right" }) },
    }).spin_direction).toBe("right");

    expect(agregar(basico({ ratchet: peca("ratchet") })).spin_direction).toBe(DESCONHECIDO);
  });

  it("giro dual é propagado como dual", () => {
    expect(agregar(basico({
      blade: peca("blade", { spin_direction: "dual" }),
    })).spin_direction).toBe("dual");
  });

  it("a escala ordinal de resistência é a da spec", () => {
    expect(ORDINAL_RESISTENCIA).toEqual({
      very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
    });
  });
});
