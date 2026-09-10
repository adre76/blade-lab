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
});
