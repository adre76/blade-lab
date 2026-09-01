import { describe, expect, it } from "vitest";
import { PERGUNTAS, GRUPOS } from "./faq.ts";
import { carregarPartes, carregarBeyblades } from "./seed/carregar.ts";

const RAIZ = new URL("../../data/", import.meta.url);
const partes = carregarPartes(RAIZ);
const beys = carregarBeyblades(RAIZ);

describe("integridade do FAQ", () => {
  it("há perguntas para verificar", () => {
    expect(PERGUNTAS.length).toBeGreaterThan(0);
  });

  /**
   * A razão de o FAQ morar em arquivo versionado e não numa tabela: quando o
   * catálogo muda, uma resposta que cita peça que saiu quebra aqui, em vez de
   * envelhecer calada na tela.
   */
  it("toda peça citada existe no catálogo", () => {
    const existem = new Set(partes.map((p) => p.name));
    const quebradas = PERGUNTAS.flatMap((p) =>
      p.cita_pecas.filter((n) => !existem.has(n)).map((n) => `${p.id}: '${n}'`),
    );
    expect(quebradas).toEqual([]);
  });

  it("todo bey citado existe no catálogo", () => {
    const existem = new Set(beys.map((b) => b.release_code));
    const quebrados = PERGUNTAS.flatMap((p) =>
      p.cita_beys.filter((c) => !existem.has(c)).map((c) => `${p.id}: '${c}'`),
    );
    expect(quebrados).toEqual([]);
  });

  it("resposta da wiki tem fonte; as outras não têm", () => {
    const erradas = PERGUNTAS.filter((p) =>
      p.origem === "wiki" ? !p.fonte : Boolean(p.fonte),
    ).map((p) => `${p.id} (${p.origem})`);
    expect(erradas).toEqual([]);
  });

  it("id é único", () => {
    const vistos = new Set<string>();
    const repetidos = PERGUNTAS.filter((p) => {
      if (vistos.has(p.id)) return true;
      vistos.add(p.id);
      return false;
    }).map((p) => p.id);
    expect(repetidos).toEqual([]);
  });

  it("todo grupo é um dos previstos", () => {
    const fora = PERGUNTAS.filter(
      (p) => !(GRUPOS as readonly string[]).includes(p.grupo),
    ).map((p) => p.id);
    expect(fora).toEqual([]);
  });

  /**
   * O mesmo cuidado que já protege as notas do catálogo: `resposta` é texto
   * que uma criança lê, não comentário de desenvolvedor.
   */
  it("nenhuma resposta cita nome de coluna do banco", () => {
    const TECNICOS = [
      "release_type", "release_code", "burst_resistance", "part_type",
      "spin_direction", "rarity_reason", "data_disputed", "weight_g",
      "height_mm", "source_url", "contact_points",
    ];
    const vazando = PERGUNTAS
      .filter((p) => TECNICOS.some((t) => p.resposta.includes(t)))
      .map((p) => p.id);
    expect(vazando).toEqual([]);
  });

  /**
   * O leitor é uma criança lendo sozinha no celular. Parágrafo muito longo é
   * onde ela desiste — e é o defeito mais fácil de introduzir sem perceber ao
   * editar o texto depois.
   */
  it("nenhum parágrafo passa de 400 caracteres", () => {
    const longos = PERGUNTAS.flatMap((p) =>
      p.resposta.split("\n\n")
        .filter((par) => par.length > 400)
        .map((par) => `${p.id}: ${par.length} caracteres`),
    );
    expect(longos).toEqual([]);
  });
});
