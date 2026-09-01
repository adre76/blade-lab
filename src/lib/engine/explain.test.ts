import { describe, expect, it } from "vitest";
import { contribuicoes } from "./explain.ts";
import { agregar } from "./stats.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (slot: string, attack: number, defense: number, stamina: number) =>
  ({ id: `id-${slot}`, slot, name: `${slot}!`, attack, defense, stamina,
     weight_g: null } as unknown as Peca);

const COMBO: Combo = {
  anatomy: "basic",
  pecas: {
    blade: peca("blade", 60, 25, 15),
    ratchet: peca("ratchet", 15, 9, 6),
    bit: peca("bit", 45, 5, 10),
  },
};

describe("contribuição por peça", () => {
  it("devolve uma entrada por slot preenchido, na ordem da anatomia", () => {
    expect(contribuicoes(COMBO).map((c) => c.slot)).toEqual(["blade", "ratchet", "bit"]);
  });

  it("a contribuição é o valor bruto da peça", () => {
    const [blade] = contribuicoes(COMBO);
    expect(blade).toMatchObject({ attack: 60, defense: 25, stamina: 15 });
    expect(blade!.peca.name).toBe("blade!");
  });

  /**
   * A propriedade que sustenta a promessa de "nenhum número sem origem":
   * se a soma das parcelas não reproduzisse o total, a tela estaria mentindo.
   */
  it("a soma das contribuições reproduz o total agregado", () => {
    for (const c of [COMBO, { ...COMBO, anatomy: "unique" as const }]) {
      const total = agregar(c);
      const soma = contribuicoes(c).reduce(
        (acc, x) => ({ attack: acc.attack + x.attack, defense: acc.defense + x.defense,
                       stamina: acc.stamina + x.stamina }),
        { attack: 0, defense: 0, stamina: 0 },
      );
      expect(soma).toEqual({
        attack: total.attack, defense: total.defense, stamina: total.stamina,
      });
    }
  });

  it("a propriedade vale também na unique_expand, de dois slots", () => {
    const c: Combo = {
      anatomy: "unique_expand",
      pecas: {
        integrated_blade: peca("integrated_blade", 85, 35, 25),
        bit: peca("bit", 45, 5, 10),
      },
    };
    const total = agregar(c);
    const soma = contribuicoes(c).reduce((a, x) => a + x.attack, 0);
    expect(soma).toBe(total.attack);
  });

  it("a ordem é a da anatomia, não a de inserção", () => {
    const foraDeOrdem: Combo = {
      anatomy: "basic",
      pecas: {
        bit: peca("bit", 45, 5, 10),
        blade: peca("blade", 60, 25, 15),
        ratchet: peca("ratchet", 15, 9, 6),
      },
    };
    expect(contribuicoes(foraDeOrdem).map((c) => c.slot)).toEqual(["blade", "ratchet", "bit"]);
  });

  it("combo vazio não contribui com nada", () => {
    expect(contribuicoes({ anatomy: "basic", pecas: {} })).toEqual([]);
  });
});
