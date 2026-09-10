import { describe, expect, it } from "vitest";
import { beyDaPagina, conferirGiro } from "./bey.ts";

const CUSTOM = `{{Beyblade Infobox
|AKA=DranBrave Slash Six Sixty Vortex<br>Courage Dran S 6-60V ([[Hasbro]])
|ProductCode=CX-01 (Takara Tomy)<br>G1677 (Hasbro)
|Type=Attack
|SpinDirection=Right-Spin
|System=Custom Line
|LockChip=Dran
|MainBlade=Brave
|AssistBlade=Slash
|Ratchet=6-60
|Bit=Vortex
}}`;

const INTEGRADO = `{{Beyblade Infobox
|ProductCode=CX-07 (Takara Tomy)<br>G2350 (Hasbro)
|Type=Attack
|SpinDirection=Right-Spin
|System=Custom Line
|LockChip=Pegasus
|MainBlade=Blast
|AssistBlade=Assault
|RatchetBit=Turbo
}}`;

const CANHOTO = `{{Beyblade Infobox
|ProductCode=BX-00
|Type=Attack
|SpinDirection=Left-Spin
|System=Basic Line
|System2=X-Over Project
|BladeX=Lightning L-Drago (Upper Type)
|Ratchet=1-60
|Bit=Flat
}}`;

// Nenhuma peça real de CX publica um ProductCode assim — este fixture existe
// só para exercitar o `throw` que substitui o antigo "sem rótulo = hasbro".
const CODIGO_INDECIFRAVEL = `{{Beyblade Infobox
|ProductCode=???
|Type=Attack
|SpinDirection=Right-Spin
|System=Custom Line
|LockChip=Dran
|MainBlade=Brave
|AssistBlade=Slash
|Ratchet=6-60
|Bit=Vortex
}}`;

// Igual à CUSTOM, mas sem ProductCode nenhum — o padrão real das quatro
// combinações de anime/mangá que a coleta ao vivo encontrou na Custom Line
// (DranBrave H6-60V, HellsReaper TOp, WizardMight R4-55LO, WolfHunt
// F4-60T): System e peças presentes, ProductCode ausente.
const SEM_PRODUCTCODE = `{{Beyblade Infobox
|Type=Attack
|SpinDirection=Right-Spin
|System=Custom Line
|LockChip=Dran
|MainBlade=Brave
|AssistBlade=Slash
|Ratchet=6-60
|Bit=Vortex
}}`;

// A página real que a revisão ao vivo encontrou (achado do round 2): a wiki
// publica "Fort Hornet R 7-60T" sob o nome HASBRO, com o ProductCode Hasbro
// em primeiro lugar no <br> — e é o AKA rotulado "([[Takara Tomy]])", com
// colchetes de wikilink, que carrega o nome canônico Takara Tomy.
const FORT_HORNET = `{{Beyblade Infobox
|AKA=Fort Hornet Round Seven Sixty Taper<br>HornetFort R7-60T ([[Takara Tomy]])
|ProductCode=G1682 (Hasbro)<br>CX-00 (Takara Tomy)
|Type=Attack
|SpinDirection=Right-Spin
|System=Custom Line
|LockChip=Dran
|MainBlade=Brave
|AssistBlade=Slash
|Ratchet=7-60
|Bit=Taper
}}`;

// Mesma página, mas com o rótulo do AKA na grafia SEM colchetes — a que as
// páginas de peça usam. Prova que as duas grafias caem no mesmo caminho.
const FORT_HORNET_SEM_COLCHETES = `{{Beyblade Infobox
|AKA=Fort Hornet Round Seven Sixty Taper<br>HornetFort R7-60T (Takara Tomy)
|ProductCode=G1682 (Hasbro)<br>CX-00 (Takara Tomy)
|Type=Attack
|SpinDirection=Right-Spin
|System=Custom Line
|LockChip=Dran
|MainBlade=Brave
|AssistBlade=Slash
|Ratchet=7-60
|Bit=Taper
}}`;

describe("bey a partir da página", () => {
  it("lê código, nome, linha e anatomia", () => {
    const b = beyDaPagina("DranBrave S6-60V", CUSTOM);
    expect(b.release_code).toBe("CX-01");
    expect(b.name).toBe("DranBrave S6-60V");
    expect(b.line).toBe("CX");
    expect(b.anatomy).toBe("custom");
  });

  it("lista as peças com o slot de cada uma", () => {
    expect(beyDaPagina("DranBrave S6-60V", CUSTOM).parts).toEqual([
      { slot: "lock_chip", name: "Dran" },
      { slot: "main_blade", name: "Brave" },
      { slot: "assist_blade", name: "Slash" },
      { slot: "ratchet", name: "6-60" },
      { slot: "bit", name: "Vortex" },
    ]);
  });

  it("reconhece a anatomia da ponta com catraca", () => {
    const b = beyDaPagina("PegasusBlast ATr", INTEGRADO);
    expect(b.anatomy).toBe("custom_integrated");
    expect(b.parts.map((p) => p.slot)).not.toContain("ratchet");
  });

  /**
   * System2 carrega "X-Over Project" além de "Expand Blade". Se a anatomia
   * saísse da PRESENÇA do campo, este bey viraria custom_expand.
   */
  it("System2 de colaboração não muda a anatomia", () => {
    expect(beyDaPagina("Lightning L-Drago 1-60F (Upper Type)", CANHOTO).anatomy)
      .toBe("basic");
  });

  it("lê o sentido de giro do bey", () => {
    expect(beyDaPagina("Lightning L-Drago 1-60F (Upper Type)", CANHOTO).spin_direction)
      .toBe("left");
  });

  it("bey com ProductCode rotulado (Takara Tomy) é takara_tomy", () => {
    expect(beyDaPagina("DranBrave S6-60V", CUSTOM).brand).toBe("takara_tomy");
  });

  /**
   * A CANHOTO não tem rótulo nenhum no ProductCode ("BX-00" seco) — é o
   * formato do código (BX- seguido de dígitos) que decide a marca, mesma
   * regra endurecida de `peca.ts` (Task 5, 22/102 peças reais erradas na
   * versão antiga "sem rótulo = hasbro").
   */
  it("bey sem rótulo de marca usa o formato do código", () => {
    expect(beyDaPagina("Lightning L-Drago 1-60F (Upper Type)", CANHOTO).brand)
      .toBe("takara_tomy");
  });

  it("bey com ProductCode indecifrável lança, em vez de assumir hasbro", () => {
    expect(() => beyDaPagina("DranBrave S6-60V", CODIGO_INDECIFRAVEL)).toThrow(/marca/i);
  });

  /**
   * Página sem ProductCode nenhum: o padrão real das quatro combinações de
   * anime/mangá (DranBrave H6-60V, HellsReaper TOp, WizardMight R4-55LO,
   * WolfHunt F4-60T) que a coleta ao vivo encontrou. Tem que lançar com o
   * motivo certo — "não é produto lançado" — e não com a mensagem de
   * `marcaDoCodigo` ("não dá para determinar a marca"), que mandaria quem lê
   * o descarte investigar uma marca em vez de perceber que a página nunca
   * foi um produto.
   */
  it("bey sem ProductCode lança citando 'não é produto lançado', não marca", () => {
    expect(() => beyDaPagina("DranBrave S6-60V", SEM_PRODUCTCODE))
      .toThrow(/não é um produto lançado/i);
    expect(() => beyDaPagina("DranBrave S6-60V", SEM_PRODUCTCODE))
      .not.toThrow(/marca/i);
  });

  /**
   * Achado da revisão ao vivo, round 2: página real publicada sob o nome
   * Hasbro, com o ProductCode Hasbro em primeiro lugar no <br>. Nome e
   * release_code têm que seguir a marca do registro (takara_tomy, porque a
   * promoção do AKA vence), não o título da página nem a ordem em que os
   * códigos aparecem.
   */
  it("bey publicado sob nome Hasbro com AKA (Takara Tomy): nome e release_code seguem a marca", () => {
    const b = beyDaPagina("Fort Hornet R 7-60T", FORT_HORNET);
    expect(b.name).toBe("HornetFort R7-60T");
    expect(b.release_code).toBe("CX-00");
    expect(b.brand).toBe("takara_tomy");
    expect(b.aka).toEqual(["Fort Hornet R 7-60T"]);
  });

  it("reconhece o rótulo (Takara Tomy) sem colchetes de wikilink também", () => {
    const b = beyDaPagina("Fort Hornet R 7-60T", FORT_HORNET_SEM_COLCHETES);
    expect(b.name).toBe("HornetFort R7-60T");
    expect(b.release_code).toBe("CX-00");
  });

  it("caso comum não muda: sem AKA (Takara Tomy), nome é o título e release_code é o único valor", () => {
    const b = beyDaPagina("Lightning L-Drago 1-60F (Upper Type)", CANHOTO);
    expect(b.name).toBe("Lightning L-Drago 1-60F (Upper Type)");
    expect(b.release_code).toBe("BX-00");
    expect(b.aka).toBeNull();
  });

  /**
   * A única conferência cruzada disponível para a regra de giro na CX: não há
   * nenhuma peça CX canhota publicada, então o motor nunca foi exercitado
   * contra um contraexemplo (spec §5.3).
   */
  it("conferirGiro aceita quando as peças concordam com o bey", () => {
    expect(() => conferirGiro(beyDaPagina("DranBrave S6-60V", CUSTOM), "right"))
      .not.toThrow();
  });

  it("conferirGiro LANÇA quando as peças discordam do bey", () => {
    expect(() => conferirGiro(beyDaPagina("DranBrave S6-60V", CUSTOM), "left"))
      .toThrow(/giro/i);
  });

  it("conferirGiro aceita quando as peças não declaram giro", () => {
    expect(() => conferirGiro(beyDaPagina("DranBrave S6-60V", CUSTOM), null))
      .not.toThrow();
  });
});
