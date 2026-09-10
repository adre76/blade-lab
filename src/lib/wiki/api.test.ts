import { describe, expect, it } from "vitest";
import { paginas, membrosDaCategoria } from "./api.ts";

/** Resposta da MediaWiki no formato que a API devolve de verdade. */
const resposta = (pages: Record<string, unknown>, redirects: unknown[] = []) => ({
  query: { redirects, pages },
});

/** Extrai a lista de títulos pedidos numa URL de `action=query&titles=...`. */
const titulosDaUrl = (url: string): string[] => {
  const titles = new URL(url).searchParams.get("titles") ?? "";
  return titles.length === 0 ? [] : titles.split("|");
};

describe("cliente da wiki", () => {
  it("devolve o wikitext indexado pelo título, com o título canônico igual ao pedido", async () => {
    const buscar = async () =>
      resposta({ "1": { title: "Blade - Dran Sword", revisions: [{ slots: { main: { "*": "TEXTO" } } }] } });
    const r = await paginas(["Blade - Dran Sword"], buscar);
    expect(r.get("Blade - Dran Sword")).toEqual({ titulo: "Blade - Dran Sword", texto: "TEXTO" });
  });

  /**
   * Metade das lâminas tem a página sob o nome Hasbro, e o nome Takara Tomy é
   * um redirect. Sem reindexar, a coleta perdia essas peças em silêncio — foi
   * o defeito que deixou metade do catálogo sem imagem na Onda 1.
   */
  it("resolve o redirect do título PEDIDO até a página canônica", async () => {
    const buscar = async () =>
      resposta(
        { "1": { title: "Tackle Goat", revisions: [{ slots: { main: { "*": "CABRA" } } }] } },
        [{ from: "GoatTackle", to: "Tackle Goat" }],
      );
    const r = await paginas(["GoatTackle"], buscar);
    expect(r.get("GoatTackle")).toEqual({ titulo: "Tackle Goat", texto: "CABRA" });
  });

  /**
   * Nas tabelas de peças da wiki, o nome Hasbro e o nome Takara Tomy aparecem
   * cada um em uma coluna — e um dos dois é redirect para o outro. Os dois
   * acabam pedidos na mesma leva. Um mapa `to→from` andado de trás pra frente
   * só cria entrada para quem foi pedido por último; o destino, que também foi
   * pedido (e é o título canônico), fica sem nada. Resolvendo para frente a
   * partir de cada título pedido, os dois recebem entrada — com o mesmo
   * conteúdo e o mesmo `titulo` canônico.
   */
  it("quando o destino também foi pedido, ambos os títulos recebem entrada", async () => {
    const buscar = async () =>
      resposta(
        { "1": { title: "Metal Blade - Fortress", revisions: [{ slots: { main: { "*": "TEXTO" } } }] } },
        [{ from: "Metal Blade - Armor", to: "Metal Blade - Fortress" }],
      );
    const r = await paginas(["Metal Blade - Armor", "Metal Blade - Fortress"], buscar);
    expect(r.get("Metal Blade - Armor")).toEqual({ titulo: "Metal Blade - Fortress", texto: "TEXTO" });
    expect(r.get("Metal Blade - Fortress")).toEqual({ titulo: "Metal Blade - Fortress", texto: "TEXTO" });
  });

  /**
   * Fan-in clássico: duas origens diferentes redirecionando para o mesmo
   * destino. As duas devem receber entrada própria, ambas com o `titulo`
   * canônico do destino.
   */
  it("quando duas origens redirecionam para o mesmo destino, ambas recebem entrada (fan-in)", async () => {
    const buscar = async () =>
      resposta(
        { "1": { title: "B", revisions: [{ slots: { main: { "*": "TEXTO-B" } } }] } },
        [{ from: "A", to: "B" }, { from: "C", to: "B" }],
      );
    const r = await paginas(["A", "C"], buscar);
    expect(r.get("A")).toEqual({ titulo: "B", texto: "TEXTO-B" });
    expect(r.get("C")).toEqual({ titulo: "B", texto: "TEXTO-B" });
  });

  /**
   * `redirects=1` resolve a cadeia inteira e devolve um hop por salto: para
   * A→B→C a página vem indexada em "C", mas os hops são [{A,B},{B,C}]. Uma
   * resolução de UM salto pararia em "B" — um título intermediário que
   * ninguém pediu. Isto prova que a resolução anda a cadeia até o final.
   */
  it("resolve um redirect encadeado (A→B→C) até o título canônico", async () => {
    const buscar = async () =>
      resposta(
        { "1": { title: "C", revisions: [{ slots: { main: { "*": "TEXTO-C" } } }] } },
        [{ from: "A", to: "B" }, { from: "B", to: "C" }],
      );
    const r = await paginas(["A"], buscar);
    expect(r.get("A")).toEqual({ titulo: "C", texto: "TEXTO-C" });
  });

  /**
   * Um ciclo de redirect (A→B→A) não deveria existir na wiki, mas a resolução
   * não pode girar para sempre se ele aparecer — o teto de passos evita travar
   * a coleta inteira por causa de uma página malformada.
   */
  it("não trava num ciclo de redirect (A→B→A)", async () => {
    const buscar = async () =>
      resposta(
        { "1": { title: "A", revisions: [{ slots: { main: { "*": "TEXTO" } } }] } },
        [{ from: "A", to: "B" }, { from: "B", to: "A" }],
      );
    const r = await paginas(["A"], buscar);
    expect(r.size).toBe(1);
  });

  it("omite página inexistente em vez de estourar", async () => {
    const buscar = async () => resposta({ "-1": { title: "Nada", missing: "" } });
    const r = await paginas(["Nada"], buscar);
    expect(r.size).toBe(0);
  });

  it("não chama buscar para uma lista vazia", async () => {
    let chamadas = 0;
    const buscar = async () => {
      chamadas++;
      return resposta({});
    };
    const r = await paginas([], buscar);
    expect(chamadas).toBe(0);
    expect(r.size).toBe(0);
  });

  /**
   * 50 é o teto rígido da API da MediaWiki para `titles=` numa requisição —
   * não um número redondo escolhido por nós. `ceil(120/LOTE) === 3` vale para
   * qualquer LOTE entre 40 e 59, então contar requisições não pega uma
   * mudança nesse número: é preciso contar títulos por requisição.
   */
  it("quebra em lotes de exatamente 50 títulos", async () => {
    const chamadas: string[] = [];
    const buscar = async (url: string) => {
      chamadas.push(url);
      return resposta({});
    };
    await paginas(Array.from({ length: 120 }, (_, i) => "P" + i), buscar);
    expect(chamadas).toHaveLength(3);
    expect(chamadas.map(titulosDaUrl).map((t) => t.length)).toEqual([50, 50, 20]);
  });

  it("um múltiplo exato de 50 não gera uma terceira requisição vazia", async () => {
    const chamadas: string[] = [];
    const buscar = async (url: string) => {
      chamadas.push(url);
      return resposta({});
    };
    await paginas(Array.from({ length: 100 }, (_, i) => "P" + i), buscar);
    expect(chamadas).toHaveLength(2);
    expect(chamadas.map(titulosDaUrl).map((t) => t.length)).toEqual([50, 50]);
  });

  it("lista os membros de uma categoria", async () => {
    const buscar = async () => ({
      query: { categorymembers: [{ title: "DranBrave S6-60V" }, { title: "WizardArc R4-55LO" }] },
    });
    expect(await membrosDaCategoria("Custom Line Beyblades", buscar))
      .toEqual(["DranBrave S6-60V", "WizardArc R4-55LO"]);
  });

  /**
   * `cmlimit=500` é maior que qualquer categoria de hoje (a maior tem 181
   * membros), mas se uma categoria crescer além do teto a API sinaliza com um
   * objeto `continue` em vez de devolver tudo. Truncar em silêncio reproduz o
   * mesmo defeito que motivou este módulo — por isso estoura em vez de
   * fingir que a lista veio completa.
   */
  it("estoura quando a resposta traz `continue` (categoria maior que o teto)", async () => {
    const buscar = async () => ({
      query: { categorymembers: [{ title: "X" }] },
      continue: { cmcontinue: "algumtoken", continue: "-||" },
    });
    await expect(membrosDaCategoria("Basic Line Beyblades", buscar)).rejects.toThrow(
      /Basic Line Beyblades/,
    );
  });
});
