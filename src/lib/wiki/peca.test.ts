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
|ProductCode=CX-04 (Takara Tomy)<br>G1679 (Hasbro)
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
|ProductCode=CX-14 (Takara Tomy)
|Classification=Ratchet-Integrated Bit
|System=Custom Line
|Weight=12.7 grams
|AttackStat=30 > 55
|DefenseStat=30 > 20
|StaminaStat=60 > 10
|HeightStat=90 > 65
}}`;

const NOME_VAZIO = `{{Part Infobox
|Name=
|ProductCode=CX-15 (Takara Tomy)
|Classification=Bit
|System=Custom Line
|AttackStat=10
|DefenseStat=10
|StaminaStat=10
}}`;

const STAG = `{{Part Infobox
|Name=Stag
|AKA=Bucks (Takara Tomy)
|ProductCode=CX-06 (Takara Tomy)<br>G1680 (Hasbro)
|Classification=Main Blade
|Type=Attack
|SpinDirection=Right-Spin
|Weight=30.5 grams
|System=Custom Line
|AttackStat=35
|DefenseStat=15
|StaminaStat=10
}}`;

const ANTLER = `{{Part Infobox
|Name=Antler
|AKA=Antlers (Takara Tomy)
|ProductCode=CX-07 (Takara Tomy)<br>G1681 (Hasbro)
|Classification=Main Blade
|Type=Balance
|SpinDirection=Right-Spin
|Weight=29.8 grams
|System=Custom Line
|AttackStat=20
|DefenseStat=20
|StaminaStat=20
}}`;

/**
 * Round 2: as duas páginas reais que expuseram o defeito Fix1×Fix2. "Stag" e
 * "Antler" são os nomes Hasbro sob os quais a wiki publica estas páginas; o
 * ProductCode delas não carrega rótulo nenhum, só o formato Hasbro (G1684).
 * O nome canônico Takara Tomy (Bucks/Antlers) vem do AKA rotulado — e é
 * exatamente esse par de nomes que o bey Takara Tomy "BucksAntlers B2-60D"
 * (ProductCode=CX-00, LockChip=Bucks, MainBlade=Antlers) cita, provando que
 * a peça existe na linha Takara Tomy sob esse nome.
 */
const STAG_SEM_ROTULO = `{{Part Infobox
|Name=Stag
|AKA=Bucks (Takara Tomy)
|ProductCode=G1684
|Classification=Lock Chip
|SpinDirection=Right-Spin
|Weight=1.8 grams
|System=Custom Line
|AttackStat=
|DefenseStat=
|StaminaStat=
}}`;

const ANTLER_SEM_ROTULO = `{{Part Infobox
|Name=Antler
|AKA=Antlers (Takara Tomy)
|ProductCode=G1684
|Classification=Main Blade
|Type=Balance
|SpinDirection=Right-Spin
|Weight=29.8 grams
|System=Custom Line
|AttackStat=20
|DefenseStat=20
|StaminaStat=20
}}`;

/**
 * Round 3: a página real "Lock Chip - Stag" — a que expôs o defeito do
 * round 2. Aqui o ProductCode TEM rótulo, mas os dois rótulos dizem Hasbro
 * ("G1684 (Hasbro)<br>CX-00 (Hasbro)"), sendo que CX-00 é formato Custom
 * Line da Takara Tomy — a própria wiki se contradiz. O AKA rotulado
 * (Takara Tomy) é quem carrega o nome canônico.
 */
const STAG_ROTULO_CONTRADITORIO = `{{Part Infobox
|Name=Stag
|AKA=Bucks (Takara Tomy)
|ProductCode=G1684 (Hasbro)<br>CX-00 (Hasbro)
|Classification=Lock Chip
|SpinDirection=Right-Spin
|Weight=1.8 grams
|System=Custom Line
|AttackStat=
|DefenseStat=
|StaminaStat=
}}`;

const pecaComCodigo = (codigo: string) => `{{Part Infobox
|Name=Teste
|ProductCode=${codigo}
|Classification=Bit
|System=Custom Line
|AttackStat=10
|DefenseStat=10
|StaminaStat=10
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

  /**
   * Fix 4: o precedente do Hells Nether agrupa por MODO (um trio completo
   * por vez), não um par por stat — e o texto não pode vazar o `>` ou o `/`
   * crus da wiki, porque quem lê é uma criança e "30 > 55" soa como uma
   * desigualdade falsa em português.
   */
  it("grava o primeiro dos dois modos e explica os dois em notes, por modo e sem separador cru", () => {
    const p = pecaDaPagina("Ratchet-Integrated Bit - Turbo", DOIS_MODOS);
    expect([p.attack, p.defense, p.stamina]).toEqual([30, 30, 60]);
    expect(p.notes).toMatch(/dois conjuntos/i);
    expect(p.notes).toContain("ataque 30, defesa 30 e resistência 60");
    expect(p.notes).toContain("ataque 55, defesa 20 e resistência 10");
    expect(p.notes).not.toMatch(/[>/]/);
    expect(p.data_disputed).toBe(false);
  });

  it("extrai o nome Hasbro do campo AKA", () => {
    expect(pecaDaPagina("Main Blade - Brave", MAIN_BLADE).aka).toEqual(["Courage"]);
  });

  // Fix 2: a página pode estar publicada sob o nome Hasbro, com o AKA
  // rotulado (Takara Tomy) carregando o nome canônico — os dois trocam.
  it("página sob nome Hasbro com AKA (Takara Tomy): o AKA vira nome, o Name vira aka", () => {
    const stag = pecaDaPagina("Main Blade - Stag", STAG);
    expect(stag.name).toBe("Bucks");
    expect(stag.aka).toEqual(["Stag"]);

    const antler = pecaDaPagina("Main Blade - Antler", ANTLER);
    expect(antler.name).toBe("Antlers");
    expect(antler.aka).toEqual(["Antler"]);
  });

  // Fix 3: `Name=` presente e vazio não é o mesmo que ausente — `??` não
  // recai no título, `||` recai.
  it("Name vazio cai no título, não vira nome vazio", () => {
    expect(pecaDaPagina("Bit - Sharp", NOME_VAZIO).name).toBe("Sharp");
  });

  // Fix 5: spin_direction é exclusivo da lâmina principal (spec §4.4); nunca
  // havia asserção direta sobre o valor, só sobre slots que não o carregam.
  it("spin_direction só é gravado na lâmina principal", () => {
    expect(pecaDaPagina("Main Blade - Brave", MAIN_BLADE).spin_direction).toBe("right");
    expect(pecaDaPagina("Lock Chip - Dran", LOCK_CHIP).spin_direction).toBeNull();
  });

  it("peça sem código Takara Tomy é hasbro", () => {
    expect(pecaDaPagina("Ratchet-Integrated Blade - Seize Jaguar", SEM_STATS).brand)
      .toBe("hasbro");
    expect(pecaDaPagina("Lock Chip - Dran", LOCK_CHIP).brand).toBe("takara_tomy");
  });

  // Fix 1: rótulo explícito manda; sem rótulo, o FORMATO do código decide;
  // sem rótulo e sem formato reconhecível, lança em vez de adivinhar.
  describe("marca a partir do ProductCode (Fix 1)", () => {
    it("rótulo (Takara Tomy) explícito manda", () => {
      expect(pecaDaPagina("Bit - Teste", pecaComCodigo("CX-05 (Takara Tomy)")).brand)
        .toBe("takara_tomy");
    });

    it("rótulo (Hasbro) explícito manda, sem rótulo Takara Tomy", () => {
      expect(pecaDaPagina("Bit - Teste", pecaComCodigo("G1670 (Hasbro)")).brand)
        .toBe("hasbro");
    });

    it("sem rótulo, formato BX-/UX-/CX- seguido de dígitos é takara_tomy", () => {
      expect(pecaDaPagina("Bit - Teste", pecaComCodigo("CX-13")).brand).toBe("takara_tomy");
    });

    it("sem rótulo, formato G seguido de dígitos é hasbro", () => {
      expect(pecaDaPagina("Bit - Teste", pecaComCodigo("G1684")).brand).toBe("hasbro");
    });

    it("sem rótulo e sem formato reconhecível, lança nomeando a página e o código", () => {
      expect(() => pecaDaPagina("Bit - Teste", pecaComCodigo("XYZ-99")))
        .toThrow(/Bit - Teste/);
      expect(() => pecaDaPagina("Bit - Teste", pecaComCodigo("XYZ-99")))
        .toThrow(/XYZ-99/);
    });
  });

  // Round 2: Fix 1 (marca pelo ProductCode) e Fix 2 (AKA (Takara Tomy) vira
  // nome) discordavam quando combinados nas duas páginas reais que os
  // precisam — o ProductCode delas não tem rótulo, só formato Hasbro, então
  // Fix 1 carimbava hasbro sobre um nome que Fix 2 acabara de promover a
  // Takara Tomy. A marca tem que seguir o nome canônico nesse caso.
  describe("marca segue o nome canônico quando o AKA promove o nome Takara Tomy (round 2)", () => {
    it("AKA (Takara Tomy) + ProductCode sem rótulo em formato Hasbro: brand vira takara_tomy", () => {
      const stag = pecaDaPagina("Lock Chip - Stag", STAG_SEM_ROTULO);
      expect(stag.name).toBe("Bucks");
      expect(stag.brand).toBe("takara_tomy");
      expect(stag.aka).toEqual(["Stag"]);

      const antler = pecaDaPagina("Main Blade - Antler", ANTLER_SEM_ROTULO);
      expect(antler.name).toBe("Antlers");
      expect(antler.brand).toBe("takara_tomy");
      expect(antler.aka).toEqual(["Antler"]);
    });

    it("caso comum não muda: ProductCode sem rótulo em formato Hasbro, sem AKA (Takara Tomy), continua hasbro", () => {
      expect(pecaDaPagina("Bit - Teste", pecaComCodigo("G1684")).brand).toBe("hasbro");
    });
  });

  // Round 3: a promoção do AKA (Takara Tomy) precisa vencer até um rótulo
  // (Hasbro) EXPLÍCITO no ProductCode, porque a própria página real cujo
  // código contradiz sua seção de produtos ativa prova que o rótulo do
  // código pode estar errado.
  it("AKA (Takara Tomy) vence rótulo (Hasbro) explícito no ProductCode", () => {
    const p = pecaDaPagina("Lock Chip - Stag", STAG_ROTULO_CONTRADITORIO);
    expect(p.name).toBe("Bucks");
    expect(p.aka).toEqual(["Stag"]);
    expect(p.brand).toBe("takara_tomy");
  });

  it("monta a source_url a partir do título", () => {
    expect(pecaDaPagina("Lock Chip - Dran", LOCK_CHIP).source_url)
      .toBe("https://beyblade.fandom.com/wiki/Lock_Chip_-_Dran");
  });
});
