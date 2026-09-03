import { describe, expect, it } from "vitest";
import { slotsDe, ANATOMIAS_CONHECIDAS, anatomiasMontaveis } from "./slots.ts";
import { ANATOMIAS } from "../anatomias.ts";
import type { Peca } from "./types.ts";

const peca = (slot: string) => ({ id: slot, slot, name: slot } as unknown as Peca);

/** O que o catálogo tem hoje: BX, UX e as três lâminas com catraca integrada. */
const CATALOGO_HOJE = [peca("blade"), peca("ratchet"), peca("bit"), peca("integrated_blade")];

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

describe("anatomias que o catálogo consegue montar", () => {
  it("com o catálogo de hoje, oferece basic e unique_expand", () => {
    expect(anatomiasMontaveis(CATALOGO_HOJE)).toEqual(["basic", "unique_expand"]);
  });

  /**
   * A distinção BX/UX é comercial, não de montagem: as duas exigem lâmina,
   * catraca e ponta. Duas opções idênticas dariam números idênticos.
   */
  it("basic e unique dividem uma vaga só, por terem a mesma composição", () => {
    expect(anatomiasMontaveis(CATALOGO_HOJE)).not.toContain("unique");
  });

  /**
   * Este é o teste que separa "declarada" de "montável". A CX está no
   * anatomies.json e no enum do banco desde a Onda 0 e não tem peça nenhuma.
   */
  it("a CX fica de fora enquanto não houver peça dos slots dela", () => {
    const oferecidas = anatomiasMontaveis(CATALOGO_HOJE);
    expect(oferecidas).not.toContain("custom");
    expect(oferecidas).not.toContain("custom_expand");
  });

  it("a CX entra sozinha quando as peças dela chegarem", () => {
    const comCX = [
      ...CATALOGO_HOJE,
      peca("lock_chip"), peca("main_blade"), peca("assist_blade"),
    ];
    expect(anatomiasMontaveis(comCX)).toEqual(["basic", "unique_expand", "custom"]);
  });

  it("slot faltando barra a anatomia inteira: não se monta meia CX", () => {
    const semAssist = [...CATALOGO_HOJE, peca("lock_chip"), peca("main_blade")];
    expect(anatomiasMontaveis(semAssist)).not.toContain("custom");
  });

  it("catálogo vazio não oferece nada", () => {
    expect(anatomiasMontaveis([])).toEqual([]);
  });

  /**
   * Um link compartilhado pode trazer qualquer anatomia conhecida. Se ela
   * sumisse da lista, a tela mostraria os seletores dela sem nenhuma opção
   * marcada — e o usuário não teria como saber em que anatomia está.
   */
  it("a anatomia em uso entra mesmo sem peça no catálogo", () => {
    expect(anatomiasMontaveis(CATALOGO_HOJE, "custom")).toEqual(
      ["basic", "unique_expand", "custom"],
    );
  });

  it("a anatomia em uso toma a vaga da composição dela, sem reordenar a lista", () => {
    expect(anatomiasMontaveis(CATALOGO_HOJE, "unique")).toEqual(["unique", "unique_expand"]);
  });
});
