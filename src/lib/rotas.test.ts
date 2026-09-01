import { describe, expect, it } from "vitest";
import { destinoDaRaiz } from "./rotas.ts";

describe("destino da raiz", () => {
  it("raiz limpa fica na landing", () => {
    expect(destinoDaRaiz("")).toBeNull();
    expect(destinoDaRaiz("?")).toBeNull();
  });

  it("busca compartilhada vai para o catálogo, com a querystring inteira", () => {
    expect(destinoDaRaiz("?q=Keel+Shark")).toBe("/catalogo?q=Keel+Shark");
  });

  it("filtro de tipo e de raridade também", () => {
    expect(destinoDaRaiz("?tipo=attack")).toBe("/catalogo?tipo=attack");
    expect(destinoDaRaiz("?raridade=very_rare")).toBe("/catalogo?raridade=very_rare");
  });

  it("preserva vários parâmetros de uma vez", () => {
    expect(destinoDaRaiz("?q=dran&raridade=rare")).toBe("/catalogo?q=dran&raridade=rare");
  });

  /** O combo é do laboratório, não do catálogo: o link vai para /lab. */
  it("combo vai para o laboratório", () => {
    expect(destinoDaRaiz("?combo=basic:blade=abc")).toBe("/lab?combo=basic%3Ablade%3Dabc");
  });

  it("parâmetro que não é nosso não redireciona nada", () => {
    expect(destinoDaRaiz("?utm_source=twitter")).toBeNull();
  });

  it("parâmetro nosso junto de um alheio ainda redireciona, e leva os dois", () => {
    expect(destinoDaRaiz("?q=dran&utm_source=x")).toBe("/catalogo?q=dran&utm_source=x");
  });
});
