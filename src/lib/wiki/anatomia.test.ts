import { describe, expect, it } from "vitest";
import { anatomiaDe, pecasDoInfobox } from "./anatomia.ts";

const box = (o: Record<string, string>) => new Map(Object.entries(o));

describe("anatomia a partir dos campos do infobox", () => {
  it("BladeX + Ratchet + Bit é basic", () => {
    expect(anatomiaDe(box({ BladeX: "DranSword", Ratchet: "3-60", Bit: "Flat" })))
      .toBe("basic");
  });

  it("Blade + Ratchet + Bit também é basic", () => {
    expect(anatomiaDe(box({ Blade: "DranSword", Ratchet: "3-60", Bit: "Flat" })))
      .toBe("basic");
  });

  it("RatchetBlade + Bit é unique_expand", () => {
    expect(anatomiaDe(box({ RatchetBlade: "GloryValkyrie", Bit: "Low Flat" })))
      .toBe("unique_expand");
  });

  it("LockChip + MainBlade + AssistBlade + Ratchet + Bit é custom", () => {
    expect(anatomiaDe(box({
      LockChip: "Dran", MainBlade: "Brave", AssistBlade: "Slash",
      Ratchet: "6-60", Bit: "Vortex",
    }))).toBe("custom");
  });

  it("com OverBlade e MetalBlade é custom_expand", () => {
    expect(anatomiaDe(box({
      LockChip: "Bahamut", OverBlade: "Break", MetalBlade: "Blitz",
      AssistBlade: "Knuckle", Ratchet: "1-50", Bit: "Ignition",
    }))).toBe("custom_expand");
  });

  it("RatchetBit no lugar da catraca é custom_integrated", () => {
    expect(anatomiaDe(box({
      LockChip: "Pegasus", MainBlade: "Blast", AssistBlade: "Assault", RatchetBit: "Turbo",
    }))).toBe("custom_integrated");
  });

  /**
   * `Ratchet` é prefixo de `RatchetBlade` e de `RatchetBit`. Casar por prefixo
   * daria catraca a um bey que não tem catraca.
   */
  it("não confunde Ratchet com RatchetBlade nem com RatchetBit", () => {
    const p = pecasDoInfobox(box({ RatchetBit: "Turbo" }));
    expect(p.has("ratchet")).toBe(false);
    expect(p.get("integrated_bit")).toBe("Turbo");
  });

  it("ignora campo de peça vazio", () => {
    const p = pecasDoInfobox(box({ BladeX: "DranSword", Ratchet: "", Bit: "Flat" }));
    expect(p.has("ratchet")).toBe(false);
  });

  /**
   * A regra que substitui a heurística do campo System. Um conjunto de slots
   * que não casa com nenhuma anatomia é composição nova ou erro de leitura —
   * nos dois casos, parar é melhor que escolher a anatomia mais parecida.
   */
  it("LANÇA quando o conjunto de slots não casa com nenhuma anatomia", () => {
    expect(() => anatomiaDe(box({ BladeX: "X", Bit: "Flat" })))
      .toThrow(/bit\+blade/);
  });

  it("LANÇA quando o infobox não declara peça nenhuma", () => {
    expect(() => anatomiaDe(box({ Type: "Attack" }))).toThrow(/nenhum campo de peça/);
  });

  /**
   * `BladeX` e `Blade` mapeiam para o mesmo slot ("blade"). Se uma página
   * declarar os dois com valores diferentes, sobrescrever em silêncio é
   * exatamente a adivinhação que este módulo existe para evitar.
   */
  it("LANÇA quando dois campos do mesmo slot têm valores diferentes", () => {
    expect(() => pecasDoInfobox(box({ BladeX: "DranSword", Blade: "GloryValkyrie" })))
      .toThrow(/blade.*BladeX.*DranSword.*Blade.*GloryValkyrie/s);
  });

  /**
   * Mesmo valor nos dois campos não é uma divergência de dado — é uma
   * redundância inofensiva (ex.: página migrando de `Blade` para `BladeX`
   * e mantendo os dois por um tempo). Não lançar aqui.
   */
  it("não lança quando dois campos do mesmo slot têm o mesmo valor", () => {
    const p = pecasDoInfobox(box({ BladeX: "DranSword", Blade: "DranSword" }));
    expect(p.get("blade")).toBe("DranSword");
  });
});
