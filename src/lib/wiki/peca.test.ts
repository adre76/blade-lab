import { describe, expect, it } from "vitest";
import { pecaDaPagina } from "./peca.ts";

const LOCK_CHIP = `{{Part Infobox
|Name=Dran
|ProductCode=CX-01 (Takara Tomy)<br>G1677 (Hasbro)
|Classification=Lock Chip
|SpinDirection=Right-Spin
|Weight=1.7 grams
|System=Custom Line
|AttackStat=
|DefenseStat=
|StaminaStat=
}}`;

const MAIN_BLADE = `{{Part Infobox
|Name=Brave
|AKA=Courage (Hasbro)
|ProductCode=CX-01 (Takara Tomy)<br>G1677 (Hasbro)
|Classification=Main Blade
|Type=Attack
|SpinDirection=Right-Spin
|Weight=31.2 grams
|System=Custom Line
|AttackStat=40
|DefenseStat=10
|StaminaStat=10
}}`;

const ASSIST_BLADE = `{{Part Infobox
|Name=Turn
|Classification=Assist Blade
|Type=Balance
|Weight=5.8 grams
|System=Custom Line
|AttackStat=10
|DefenseStat=10
|StaminaStat=20
|HeightStat=60
}}`;

const DOIS_MODOS = `{{Part Infobox
|Name=Turbo
|Classification=Ratchet-Integrated Bit
|System=Custom Line
|Weight=12.7 grams
|AttackStat=30 > 55
|DefenseStat=30 > 20
|StaminaStat=60 > 10
|HeightStat=90 > 65
}}`;

/**
 * Página real do Seize Jaguar (G4570), copiada como amostra.
 *
 * A PEÇA está fora do catálogo por outro motivo — é exclusiva da Hasbro e não
 * tem equivalente Takara Tomy (ver `data/descartes.md`). O que continua valendo
 * é a REGRA que ela ilustra: classe que pontua, com os três stats vazios, entra
 * marcada para revisão. A CX traz ~78 peças em que isso pode disparar.
 */
const SEM_STATS = `{{Part Infobox
|Name=Seize Jaguar
|Classification=Ratchet-Integrated Blade
|ProductCode=G4570
|Weight=39.4 grams
|System=Unique Line
|AttackStat=
|DefenseStat=
|StaminaStat=
}}`;

describe("peça a partir da página", () => {
  it("lê o slot pela Classification", () => {
    expect(pecaDaPagina("Lock Chip - Dran", LOCK_CHIP).slot).toBe("lock_chip");
    expect(pecaDaPagina("Main Blade - Brave", MAIN_BLADE).slot).toBe("main_blade");
    expect(pecaDaPagina("Ratchet-Integrated Bit - Turbo", DOIS_MODOS).slot)
      .toBe("integrated_bit");
  });

  it("lê linha, peso, tipo e stats", () => {
    const p = pecaDaPagina("Main Blade - Brave", MAIN_BLADE);
    expect(p.line).toBe("CX");
    expect(p.weight_g).toBe(31.2);
    expect(p.part_type).toBe("attack");
    expect([p.attack, p.defense, p.stamina]).toEqual([40, 10, 10]);
  });

  /**
   * A regra da §3 da spec. O infobox tem os campos e eles estão vazios em 28
   * de 28 Lock Chips: a classe não pontua. Grava zero — é o default da coluna
   * — e NÃO marca revisão, porque não há nada a rever.
   */
  it("Lock Chip com stats vazios vira zero sem marca de revisão", () => {
    const p = pecaDaPagina("Lock Chip - Dran", LOCK_CHIP);
    expect([p.attack, p.defense, p.stamina]).toEqual([0, 0, 0]);
    expect(p.data_disputed).toBe(false);
    expect(p.part_type).toBeNull();
    expect(p.weight_g).toBe(1.7);
  });

  /**
   * Mesmo dado, sentido oposto: aqui o vazio É lacuna, porque a classe pontua.
   * Sem essa distinção, "não pontua" e "a fonte não publica" ficariam iguais.
   */
  it("peça de classe que pontua, com stats vazios, é marcada para revisão", () => {
    const p = pecaDaPagina("Ratchet-Integrated Blade - Seize Jaguar", SEM_STATS);
    expect(p.data_disputed).toBe(true);
    expect(p.notes).toMatch(/não publica/i);
  });

  it("guarda a altura do Assist Blade na própria peça", () => {
    expect(pecaDaPagina("Assist Blade - Turn", ASSIST_BLADE).height_mm).toBe(60);
  });

  it("grava o primeiro dos dois modos e explica os dois em notes", () => {
    const p = pecaDaPagina("Ratchet-Integrated Bit - Turbo", DOIS_MODOS);
    expect([p.attack, p.defense, p.stamina]).toEqual([30, 30, 60]);
    expect(p.notes).toMatch(/dois conjuntos/i);
    expect(p.data_disputed).toBe(false);
  });

  it("extrai o nome Hasbro do campo AKA", () => {
    expect(pecaDaPagina("Main Blade - Brave", MAIN_BLADE).aka).toEqual(["Courage"]);
  });

  it("peça sem código Takara Tomy é hasbro", () => {
    expect(pecaDaPagina("Ratchet-Integrated Blade - Seize Jaguar", SEM_STATS).brand)
      .toBe("hasbro");
    expect(pecaDaPagina("Lock Chip - Dran", LOCK_CHIP).brand).toBe("takara_tomy");
  });

  it("monta a source_url a partir do título", () => {
    expect(pecaDaPagina("Lock Chip - Dran", LOCK_CHIP).source_url)
      .toBe("https://beyblade.fandom.com/wiki/Lock_Chip_-_Dran");
  });
});
