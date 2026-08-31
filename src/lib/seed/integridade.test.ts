/**
 * Integridade do catálogo, verificada sobre os ARQUIVOS de dados.
 *
 * Roda no `npm test`, antes de qualquer escrita no banco, e sem exigir
 * credencial nenhuma. É o que faz um erro de curadoria aparecer no momento em
 * que se edita o JSON, e não depois de rodar o seed.
 */
import { describe, expect, it } from "vitest";
import { carregarPartes, carregarBeyblades } from "./carregar.ts";
import anatomias from "../../../data/anatomies.json";

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
    const conhecidas = Object.keys(anatomias);
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

  it("atributos das peças estão numa faixa plausível", () => {
    const fora = partes
      .filter((p) => p.attack + p.defense + p.stamina === 0)
      .map((p) => `${p.slot} ${p.name}: todos os atributos zerados`);
    expect(fora).toEqual([]);
  });
});
