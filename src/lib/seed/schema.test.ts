import { describe, expect, it } from "vitest";
import { PartSchema, BeybladeSchema } from "./schema.ts";

const PECA_VALIDA = {
  slot: "blade",
  name: "Dran Sword",
  line: "BX",
  attack: 55,
  defense: 25,
  stamina: 20,
  weight_g: 34.9,
  spin_direction: "right",
  part_type: "attack",
  source_url: "https://exemplo.com/fonte",
};

describe("PartSchema", () => {
  it("aceita uma peça válida", () => {
    expect(() => PartSchema.parse(PECA_VALIDA)).not.toThrow();
  });

  it("assume takara_tomy quando a marca não é informada", () => {
    expect(PartSchema.parse(PECA_VALIDA).brand).toBe("takara_tomy");
  });

  it("recusa peça sem source_url", () => {
    const { source_url: _, ...sem } = PECA_VALIDA;
    expect(() => PartSchema.parse(sem)).toThrow();
  });

  it("recusa slot fora do enum", () => {
    expect(() => PartSchema.parse({ ...PECA_VALIDA, slot: "propeller" })).toThrow();
  });

  it("recusa atributo negativo", () => {
    expect(() => PartSchema.parse({ ...PECA_VALIDA, attack: -1 })).toThrow();
  });

  // As quatro regras abaixo são as colunas restritas a slot do spec §4.4.
  // Nenhuma constraint do banco as protege — só este schema.
  it("recusa spin_direction fora da lâmina principal", () => {
    expect(() =>
      PartSchema.parse({ ...PECA_VALIDA, slot: "ratchet", spin_direction: "right" }),
    ).toThrow(/spin_direction/);
  });

  it("aceita spin_direction em main_blade e metal_blade", () => {
    for (const slot of ["main_blade", "metal_blade"]) {
      expect(() => PartSchema.parse({ ...PECA_VALIDA, slot })).not.toThrow();
    }
  });

  it("recusa height_mm fora de ratchet", () => {
    expect(() => PartSchema.parse({ ...PECA_VALIDA, height_mm: 60 })).toThrow(/height_mm/);
  });

  it("recusa contact_points fora de ratchet", () => {
    expect(() => PartSchema.parse({ ...PECA_VALIDA, contact_points: 3 })).toThrow(
      /contact_points/,
    );
  });

  it("recusa dash_performance fora de bit", () => {
    expect(() => PartSchema.parse({ ...PECA_VALIDA, dash_performance: "high" })).toThrow(
      /dash_performance/,
    );
  });

  it("aceita ratchet com zero pontos de contato (a linha 0-XX)", () => {
    expect(() =>
      PartSchema.parse({
        slot: "ratchet", name: "0-60", code: "0-60", line: "BX",
        attack: 3, defense: 14, stamina: 13,
        weight_g: 6.81, height_mm: 60, contact_points: 0,
        burst_resistance: "medium",
        source_url: "https://exemplo.com/fonte",
      }),
    ).not.toThrow();
  });

  it("aceita um ratchet com height_mm e contact_points", () => {
    expect(() =>
      PartSchema.parse({
        slot: "ratchet", name: "3-60", code: "3-60", line: "BX",
        attack: 15, defense: 9, stamina: 6,
        weight_g: 6.29, height_mm: 60, contact_points: 3,
        burst_resistance: "medium",
        source_url: "https://exemplo.com/fonte",
      }),
    ).not.toThrow();
  });
});

const BEY_VALIDO = {
  release_code: "BX-01",
  name: "Dran Sword 3-60F",
  line: "BX",
  anatomy: "basic",
  release_type: "starter",
  release_date: "2023-07-15",
  rarity: "common",
  bey_type: "attack",
  parts: { blade: "Dran Sword", ratchet: "3-60", bit: "Flat" },
  source_url: "https://exemplo.com/fonte",
};

describe("BeybladeSchema", () => {
  it("aceita um bey válido", () => {
    expect(() => BeybladeSchema.parse(BEY_VALIDO)).not.toThrow();
  });

  it("aceita release_date nula", () => {
    expect(() => BeybladeSchema.parse({ ...BEY_VALIDO, release_date: null })).not.toThrow();
  });

  it("recusa data em formato livre", () => {
    expect(() => BeybladeSchema.parse({ ...BEY_VALIDO, release_date: "julho/2023" })).toThrow();
  });

  it("recusa conjunto de slots incompleto para a anatomia", () => {
    expect(() =>
      BeybladeSchema.parse({ ...BEY_VALIDO, parts: { blade: "X", ratchet: "Y" } }),
    ).toThrow(/anatomia/);
  });

  it("recusa slot que não pertence à anatomia", () => {
    expect(() =>
      BeybladeSchema.parse({
        ...BEY_VALIDO,
        parts: { blade: "X", ratchet: "Y", bit: "Z", lock_chip: "W" },
      }),
    ).toThrow(/anatomia/);
  });

  it("aceita as quatro anatomias com seus slots corretos", () => {
    const casos = [
      // A Unique Line usa lâmina de UMA peça, igual à Basic. O Assist Blade é
      // exclusivo da Custom Line — confirmado em beyblade.fandom.com/wiki/
      // Unique_Line. A diferença entre BX e UX é comercial (`product_line`),
      // não de composição.
      ["unique", { blade: "a", ratchet: "b", bit: "c" }],
      ["custom", { lock_chip: "a", main_blade: "b", assist_blade: "c", ratchet: "d", bit: "e" }],
      ["custom_expand", {
        lock_chip: "a", metal_blade: "b", over_blade: "c",
        assist_blade: "d", ratchet: "e", bit: "f",
      }],
    ] as const;
    for (const [anatomy, parts] of casos) {
      expect(() => BeybladeSchema.parse({ ...BEY_VALIDO, anatomy, parts })).not.toThrow();
    }
  });

  it("recusa unique com assist_blade — o erro que a curadoria da UX revelou", () => {
    expect(() =>
      BeybladeSchema.parse({
        ...BEY_VALIDO,
        anatomy: "unique",
        parts: { blade: "a", assist_blade: "b", ratchet: "c", bit: "d" },
      }),
    ).toThrow(/anatomia/);
  });
});
