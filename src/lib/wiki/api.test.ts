import { describe, expect, it } from "vitest";
import { paginas, membrosDaCategoria } from "./api.ts";

/** Resposta da MediaWiki no formato que a API devolve de verdade. */
const resposta = (pages: Record<string, unknown>, redirects: unknown[] = []) => ({
  query: { redirects, pages },
});

describe("cliente da wiki", () => {
  it("devolve o wikitext indexado pelo título", async () => {
    const buscar = async () =>
      resposta({ "1": { title: "Blade - Dran Sword", revisions: [{ slots: { main: { "*": "TEXTO" } } }] } });
    const r = await paginas(["Blade - Dran Sword"], buscar);
    expect(r.get("Blade - Dran Sword")).toBe("TEXTO");
  });

  /**
   * Metade das lâminas tem a página sob o nome Hasbro, e o nome Takara Tomy é
   * um redirect. Sem reindexar, a coleta perdia essas peças em silêncio — foi
   * o defeito que deixou metade do catálogo sem imagem na Onda 1.
   */
  it("reindexa o redirect de volta para o título PEDIDO", async () => {
    const buscar = async () =>
      resposta(
        { "1": { title: "Tackle Goat", revisions: [{ slots: { main: { "*": "CABRA" } } }] } },
        [{ from: "GoatTackle", to: "Tackle Goat" }],
      );
    const r = await paginas(["GoatTackle"], buscar);
    expect(r.get("GoatTackle")).toBe("CABRA");
  });

  it("omite página inexistente em vez de estourar", async () => {
    const buscar = async () => resposta({ "-1": { title: "Nada", missing: "" } });
    const r = await paginas(["Nada"], buscar);
    expect(r.size).toBe(0);
  });

  it("quebra em lotes de 50 títulos", async () => {
    const chamadas: string[] = [];
    const buscar = async (url: string) => {
      chamadas.push(url);
      return resposta({});
    };
    await paginas(Array.from({ length: 120 }, (_, i) => "P" + i), buscar);
    expect(chamadas).toHaveLength(3);
  });

  it("lista os membros de uma categoria", async () => {
    const buscar = async () => ({
      query: { categorymembers: [{ title: "DranBrave S6-60V" }, { title: "WizardArc R4-55LO" }] },
    });
    expect(await membrosDaCategoria("Custom Line Beyblades", buscar))
      .toEqual(["DranBrave S6-60V", "WizardArc R4-55LO"]);
  });
});
