import { describe, expect, it } from "vitest";
import { classificar } from "./archetype.ts";
import { DESCONHECIDO } from "./types.ts";
import type { Atributos } from "./stats.ts";
import type { Contexto } from "./normalization.ts";

/** Máximos de 100 para o valor bruto e o normalizado coincidirem: os testes
 *  são sobre a CLASSIFICAÇÃO, não sobre a regra de três. */
const CTX: Contexto = {
  maximos: {
    basic: { attack: 100, defense: 100, stamina: 100 },
    unique: { attack: 100, defense: 100, stamina: 100 },
    unique_expand: { attack: 100, defense: 100, stamina: 100 },
    custom: { attack: 100, defense: 100, stamina: 100 },
    custom_expand: { attack: 100, defense: 100, stamina: 100 },
  },
  quartis: { q1: 40, q3: 46 },
};

const attrs = (extra: Partial<Atributos>): Atributos => ({
  attack: 0, defense: 0, stamina: 0, weight_g: 43, pesoParcial: false,
  burst_resistance: "medium", height_mm: 60, spin_direction: "right", ...extra,
});

describe("arquétipo", () => {
  it("dominante com 15 pontos ou mais de folga é arquétipo puro", () => {
    const r = classificar(attrs({ attack: 70, defense: 40, stamina: 30 }), CTX, "basic");
    expect(r.rotulo).toBe("Ataque");
    expect(r.dominante).toBe("attack");
  });

  it("exatamente 15 pontos de folga já é puro", () => {
    expect(classificar(attrs({ attack: 55, defense: 40, stamina: 30 }), CTX, "basic").rotulo)
      .toBe("Ataque");
  });

  it("menos de 15 pontos é equilibrado, qualificado pelos dois maiores", () => {
    const r = classificar(attrs({ attack: 50, defense: 20, stamina: 44 }), CTX, "basic");
    expect(r.rotulo).toBe("Equilibrado — Ataque/Resistência");
    expect(r.dominante).toBeNull();
  });

  it("usa os rótulos em português, com Resistência no lugar de Stamina", () => {
    expect(classificar(attrs({ stamina: 80, attack: 10, defense: 10 }), CTX, "basic").rotulo)
      .toBe("Resistência");
  });

  it("empate é resolvido na ordem fixa Ataque > Defesa > Resistência", () => {
    const r = classificar(attrs({ attack: 50, defense: 50, stamina: 50 }), CTX, "basic");
    expect(r.rotulo).toBe("Equilibrado — Ataque/Defesa");
  });

  it("burst baixo qualifica como frágil", () => {
    const r = classificar(
      attrs({ attack: 70, defense: 20, stamina: 20, burst_resistance: "low" }), CTX, "basic");
    expect(r.qualificadores).toContain("frágil");
  });

  it("burst alto qualifica como resistente", () => {
    const r = classificar(
      attrs({ attack: 70, defense: 20, stamina: 20, burst_resistance: "high" }), CTX, "basic");
    expect(r.qualificadores).toContain("resistente");
  });

  it("burst médio não qualifica", () => {
    const r = classificar(
      attrs({ attack: 70, defense: 20, stamina: 20, burst_resistance: "medium" }), CTX, "basic");
    expect(r.qualificadores).not.toContain("frágil");
    expect(r.qualificadores).not.toContain("resistente");
  });

  it("burst desconhecido NÃO qualifica: falta de dado não é fragilidade", () => {
    const r = classificar(
      attrs({ attack: 70, burst_resistance: DESCONHECIDO }), CTX, "basic");
    expect(r.qualificadores).toEqual([]);
  });

  it("peso acima do terceiro quartil qualifica como pesado", () => {
    expect(classificar(attrs({ attack: 70, weight_g: 48 }), CTX, "basic").qualificadores)
      .toContain("pesado");
  });

  it("peso abaixo do primeiro quartil qualifica como leve", () => {
    expect(classificar(attrs({ attack: 70, weight_g: 38 }), CTX, "basic").qualificadores)
      .toContain("leve");
  });

  it("peso parcial NÃO qualifica: o total não é o real", () => {
    const r = classificar(attrs({ attack: 70, weight_g: 48, pesoParcial: true }), CTX, "basic");
    expect(r.qualificadores).not.toContain("pesado");
  });

  it("sem quartis no contexto, nenhum qualificador de peso", () => {
    const semQuartis: Contexto = { ...CTX, quartis: null };
    expect(classificar(attrs({ attack: 70, weight_g: 48 }), semQuartis, "basic").qualificadores)
      .not.toContain("pesado");
  });

  it("combo vazio é equilibrado, pelo desempate", () => {
    const r = classificar(attrs({ burst_resistance: DESCONHECIDO, pesoParcial: true }),
                          CTX, "basic");
    expect(r.rotulo).toBe("Equilibrado — Ataque/Defesa");
    expect(r.qualificadores).toEqual([]);
  });
});
