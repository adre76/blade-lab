import { describe, expect, it } from "vitest";
import { slotsDe, ANATOMIAS_CONHECIDAS } from "./slots.ts";
import { ANATOMIAS } from "../anatomias.ts";

describe("slots por anatomia", () => {
  it("reproduz data/anatomies.json — a mesma fonte que popula o banco", () => {
    for (const [anatomia, slots] of Object.entries(ANATOMIAS)) {
      expect(slotsDe(anatomia as never)).toEqual(slots);
    }
  });

  it("conhece as cinco anatomias do catálogo", () => {
    expect([...ANATOMIAS_CONHECIDAS].sort()).toEqual(
      ["basic", "custom", "custom_expand", "unique", "unique_expand"],
    );
  });

  it("a Unique Line tem três slots, e não quatro — o Assist Blade é só da CX", () => {
    expect(slotsDe("unique")).toEqual(["blade", "ratchet", "bit"]);
  });

  it("unique_expand tem dois slots: a catraca vem embutida na lâmina", () => {
    expect(slotsDe("unique_expand")).toEqual(["integrated_blade", "bit"]);
  });

  it("anatomia desconhecida devolve lista vazia, não estoura", () => {
    expect(slotsDe("inexistente" as never)).toEqual([]);
  });
});
