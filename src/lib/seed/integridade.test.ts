/**
 * Integridade do catálogo, verificada sobre os ARQUIVOS de dados.
 *
 * Roda no `npm test`, antes de qualquer escrita no banco, e sem exigir
 * credencial nenhuma. É o que faz um erro de curadoria aparecer no momento em
 * que se edita o JSON, e não depois de rodar o seed.
 */
import { describe, expect, it } from "vitest";
import { carregarPartes, carregarBeyblades } from "./carregar.ts";
import { ANATOMIAS } from "../anatomias.ts";
import { NOTA_SEM_ATRIBUTOS, SLOTS_QUE_NAO_PONTUAM } from "../wiki/peca.ts";

const RAIZ = new URL("../../../data/", import.meta.url);

// O mesmo carregamento que o script de seed usa. Se divergissem, este teste
// validaria um formato que o seed não consome.
const partes = carregarPartes(RAIZ);
const beys = carregarBeyblades(RAIZ);

const chavePeca = (brand: string, slot: string, name: string) => `${brand}|${slot}|${name}`;

describe("integridade do catálogo", () => {
  it("há dados para verificar", () => {
    expect(partes.length).toBeGreaterThan(0);
    expect(beys.length).toBeGreaterThan(0);
  });

  it("toda peça referenciada por um bey existe em data/parts", () => {
    const existentes = new Set(partes.map((p) => chavePeca(p.brand, p.slot, p.name)));
    const faltando = beys.flatMap((b) =>
      Object.entries(b.parts)
        .filter(([slot, nome]) => !existentes.has(chavePeca(b.brand, slot, nome!)))
        .map(([slot, nome]) => `${b.release_code}: '${nome}' (${slot})`),
    );
    expect(faltando).toEqual([]);
  });

  it("não há peça duplicada por chave natural", () => {
    const vistas = new Set<string>();
    const duplicadas: string[] = [];
    for (const p of partes) {
      const k = chavePeca(p.brand, p.slot, p.name);
      if (vistas.has(k)) duplicadas.push(k);
      vistas.add(k);
    }
    expect(duplicadas).toEqual([]);
  });

  it("não há bey duplicado por chave natural", () => {
    const vistas = new Set<string>();
    const duplicados: string[] = [];
    for (const b of beys) {
      const k = `${b.brand}|${b.release_code}|${b.name}`;
      if (vistas.has(k)) duplicados.push(k);
      vistas.add(k);
    }
    expect(duplicados).toEqual([]);
  });

  it("toda anatomia usada existe em anatomies.json", () => {
    const conhecidas = Object.keys(ANATOMIAS);
    const desconhecidas = [...new Set(beys.map((b) => b.anatomy))].filter(
      (a) => !conhecidas.includes(a),
    );
    expect(desconhecidas).toEqual([]);
  });

  it("todo registro tem source_url", () => {
    const sem = [...partes, ...beys].filter((r) => !r.source_url).map((r) => r.name);
    expect(sem).toEqual([]);
  });

  it("toda peça hasbro aponta para uma peça takara_tomy existente", () => {
    const canonicas = new Set(
      partes.filter((p) => p.brand === "takara_tomy").map((p) => `${p.slot}|${p.name}`),
    );
    const quebradas = partes
      .filter((p) => p.brand === "hasbro")
      .filter((p) => !p.equivalent_name || !canonicas.has(`${p.slot}|${p.equivalent_name}`))
      .map((p) => p.name);
    expect(quebradas).toEqual([]);
  });

  it("nenhum bey usa peça de marca diferente da sua", () => {
    // A composição de um bey Hasbro é feita de peças Hasbro. A resolução para
    // canonical acontece na leitura (spec §4.8), nunca no dado gravado.
    const porMarca = new Map<string, Set<string>>();
    for (const p of partes) {
      const s = porMarca.get(p.brand) ?? new Set<string>();
      s.add(`${p.slot}|${p.name}`);
      porMarca.set(p.brand, s);
    }
    const erradas = beys.flatMap((b) =>
      Object.entries(b.parts)
        .filter(([slot, nome]) => !porMarca.get(b.brand)?.has(`${slot}|${nome}`))
        .map(([slot, nome]) => `${b.release_code}: '${nome}' (${slot}) não é ${b.brand}`),
    );
    expect(erradas).toEqual([]);
  });

  /**
   * O teste que faltava, e que teria acusado o catálogo incompleto sozinho.
   *
   * Os outros verificam que toda peça REFERENCIADA existe. Este verifica o
   * inverso: que toda lâmina é referenciada. É uma regra verdadeira do
   * domínio — nenhuma lâmina foi vendida solta, toda uma veio dentro de algum
   * produto. Uma lâmina órfã significa, sem ambiguidade, um bey faltando no
   * catálogo.
   *
   * Vale só para lâminas. Ratchets e bits circulam entre produtos e podem
   * legitimamente aparecer apenas em algo que ainda não catalogamos.
   */
  it("nenhuma lâmina fica órfã — cada uma veio em algum bey", () => {
    const usadas = new Set(
      beys.flatMap((b) => Object.values(b.parts).map((nome) => `${b.brand}|${nome}`)),
    );
    const orfas = partes
      .filter((p) => p.slot === "blade")
      .filter((p) => !usadas.has(`${p.brand}|${p.name}`))
      .map((p) => `${p.name} (${p.line})`);

    expect(orfas).toEqual([]);
  });

  /**
   * `notes` não é comentário de desenvolvedor: as telas de bey e de peça
   * EXIBEM esse texto ao usuário. Uma nota dizendo "burst_resistance derivado
   * da escala numerica da fonte" não diz nada a quem lê o catálogo — e foi
   * exatamente isso que ficou na tela por uma onda inteira.
   *
   * A procedência técnica de uma decisão vai no `_nota` do arquivo, que
   * nenhuma tela lê.
   */
  it("nenhuma nota exibida cita nome de coluna do banco", () => {
    const TECNICOS = [
      "burst_resistance", "dash_performance", "data_disputed", "contact_points",
      "height_mm", "weight_g", "source_url", "image_path", "part_type",
      "spin_direction", "release_code", "release_type", "equivalent_",
    ];
    const vazando = [...partes, ...beys]
      .filter((r) => r.notes && TECNICOS.some((t) => r.notes!.includes(t)))
      .map((r) => `${r.name}: ${r.notes}`);
    expect(vazando).toEqual([]);
  });

  /**
   * Zero nos três atributos normalmente é lacuna de coleta (a fonte não
   * publicou), não uma medição de verdade — por isso o teste reprova. Duas
   * exceções, ambas já convencionadas em `../wiki/peca.ts`:
   *
   * - `lock_chip`: a peça prende a Main Blade na Assist Blade, não é ponto de
   *   contato, e nenhuma das suas páginas na wiki declara atributo algum (ver
   *   `SLOTS_QUE_NAO_PONTUAM`). Ali zero é a natureza da peça, não um buraco
   *   — sinalizar isso aqui reprovaria as 27 peças `lock_chip` do catálogo CX
   *   por não terem o que nunca tiveram.
   * - qualquer peça cujo `notes` já avisa o leitor de que a fonte não
   *   publicou os atributos (o texto que `pecaDaPagina` grava quando os três
   *   vêm nulos) — a lacuna já está documentada onde a tela exibe; reprovar
   *   de novo aqui duplicaria o aviso sem apontar nada novo.
   */
  it("atributos das peças estão numa faixa plausível", () => {
    const fora = partes
      .filter((p) => !SLOTS_QUE_NAO_PONTUAM.includes(p.slot))
      .filter((p) => p.attack + p.defense + p.stamina === 0)
      .filter((p) => p.notes !== NOTA_SEM_ATRIBUTOS)
      .map((p) => `${p.slot} ${p.name}: todos os atributos zerados`);
    expect(fora).toEqual([]);
  });
});
