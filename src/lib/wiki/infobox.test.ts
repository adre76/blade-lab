import { describe, expect, it } from "vitest";
import { lerInfobox, primeiroValor, statNumerico, gramas, temDoisModos } from "./infobox.ts";

const LOCK_CHIP_DRAN = `{{Part Infobox
|Image=LockChipDran.png
|Name=Dran
|ProductCode=CX-01 (Takara Tomy)<br>G1677 (Hasbro)
|Classification=Lock Chip
|SpinDirection=Right-Spin
|Weight=1.7 grams
|System=Custom Line
|AttackStat=
|DefenseStat=
|StaminaStat=
}}Texto do artigo que nao deve ser lido.`;

describe("leitor de infobox", () => {
  it("lê os campos do infobox", () => {
    const box = lerInfobox(LOCK_CHIP_DRAN);
    expect(box.get("Name")).toBe("Dran");
    expect(box.get("Classification")).toBe("Lock Chip");
  });

  /**
   * A distinção que sustenta a §3 da spec: o campo EXISTE e está VAZIO. Ler
   * "ausente" e "vazio" como a mesma coisa apagaria a diferença entre "não
   * pontua" e "ainda não coletamos".
   */
  it("campo presente e vazio é string vazia, não ausente", () => {
    const box = lerInfobox(LOCK_CHIP_DRAN);
    expect(box.has("AttackStat")).toBe(true);
    expect(box.get("AttackStat")).toBe("");
    expect(box.has("HeightStat")).toBe(false);
  });

  it("para no fim do infobox e não lê o corpo do artigo", () => {
    expect(lerInfobox(LOCK_CHIP_DRAN).has("Texto")).toBe(false);
  });

  it("ignora chaves de templates aninhados como {{Ruby|...}}", () => {
    const box = lerInfobox("{{Beyblade Infobox\n|JPName=ドラン{{Ruby|S|スラッシュ}}\n|Type=Attack\n}}");
    expect(box.get("Type")).toBe("Attack");
  });

  it("primeiroValor corta no <br>", () => {
    expect(primeiroValor("CX-01 (Takara Tomy)<br>G1677 (Hasbro)")).toBe("CX-01 (Takara Tomy)");
  });

  it("gramas lê o peso", () => {
    expect(gramas("45.9 grams")).toBe(45.9);
    expect(gramas("")).toBeNull();
  });

  /**
   * Duas notações para a mesma coisa — modos de montagem ou de Xtreme Dash.
   * Precedente do catálogo (Hells Nether): grava-se o PRIMEIRO e explica-se os
   * dois em `notes`.
   */
  it("statNumerico devolve o primeiro valor quando há dois modos", () => {
    expect(statNumerico("30 > 55")).toBe(30);
    expect(statNumerico("20/50")).toBe(20);
    expect(statNumerico("40")).toBe(40);
  });

  it("statNumerico devolve nulo para campo vazio: vazio não é zero", () => {
    expect(statNumerico("")).toBeNull();
  });

  it("temDoisModos reconhece as duas notações", () => {
    expect(temDoisModos("30 > 55")).toBe(true);
    expect(temDoisModos("20/50")).toBe(true);
    expect(temDoisModos("40")).toBe(false);
  });

  /**
   * Achado 1 do review: um template aninhado de várias linhas (ex.:
   * {{Translation|en=...|ja=...}}) tem seu PRÓPRIO `}}` de fechamento antes
   * do `}}` que fecha o infobox. Contar por substring (`indexOf("\n}}")`)
   * para no primeiro que aparece — que é o do aninhado — e trunca o
   * infobox ali: campos genuinamente presentes (System, AttackStat) somem,
   * e os nomes dos parâmetros do aninhado (en, ja) vazam como se fossem
   * campos do infobox. A profundidade de chaves resolve isso: só um `}}`
   * que devolve a profundidade a zero fecha o infobox.
   */
  it("um template aninhado de várias linhas não trunca o infobox nem vaza seus parâmetros", () => {
    const wikitext = `{{Part Infobox
|Name=X
|Description={{Translation
|en=...
|ja=...
}}
|System=Custom Line
|AttackStat=
}}`;
    const box = lerInfobox(wikitext);
    expect(box.get("Name")).toBe("X");
    expect(box.has("System")).toBe(true);
    expect(box.get("System")).toBe("Custom Line");
    expect(box.has("AttackStat")).toBe(true);
    expect(box.get("AttackStat")).toBe("");
    expect(box.has("en")).toBe(false);
    expect(box.has("ja")).toBe(false);
  });

  /**
   * Achado 1 do review: algumas páginas trazem um hatnote (ex.:
   * {{About|...}}) antes do infobox — caso real: "Lightning L-Drago 1-60F
   * (Upper Type)". Fatiar a partir da posição 0 só funcionava por acidente,
   * porque esses hatnotes eram sempre de uma linha só. O leitor precisa
   * ancorar no template cujo nome contém "Infobox", não na posição 0.
   */
  it("ignora um hatnote antes do infobox e lê os campos corretamente", () => {
    const wikitext = `{{About|the Upper Type|the original release|Lightning L-Drago}}
{{Part Infobox
|Name=Lightning L-Drago 1-60F (Upper Type)
|System=Custom Line
|AttackStat=100
}}`;
    const box = lerInfobox(wikitext);
    expect(box.get("Name")).toBe("Lightning L-Drago 1-60F (Upper Type)");
    expect(box.get("System")).toBe("Custom Line");
    expect(box.get("AttackStat")).toBe("100");
  });

  /**
   * Achado 3 do review: risco nomeado no brief (pesos compostos) sem trava.
   * `gramas` já lida com isso por inspeção — este teste apenas garante que
   * continue lendo o primeiro peso de um valor composto real da wiki.
   */
  it("gramas lê o primeiro peso de um valor composto (BulletGriffon)", () => {
    expect(
      gramas(
        "60.6 grams (combined ''BulletGriffon'')<br>32.4 grams (''Bullet'' upper part)",
      ),
    ).toBe(60.6);
  });
});
