import { describe, expect, it } from "vitest";
import {
  analisarIndice, consultarIndice, converterData, entradasDeConjunto, itensDoConjunto,
  mesmoNome, tipoDaEntrada,
} from "./indice.ts";

// Todas as linhas abaixo são recortes reais de
// "List of Beyblade X products (Takara Tomy)" (lidos em 2026-09-10), não
// inventados — é o que o parser vai encontrar na wiki de verdade.

const TABELA_CX = `{| class="wikitable"
!Code
!Type/Name
!Release Date
! style="width:10%" |Price
|-
|CX-01
|Starter [[DranBrave S6-60V]]
|March 29th, 2025
|2200円
|-
|CX-02
|Starter [[WizardArc R4-55LO]]
|March 29th, 2025
|2200円
|-
|CX-03
|Booster [[PerseusDark B6-80W]]
|March 29th, 2025
|1600円
|-
|CX-04
|[[Battle Entry Set C]]
|March 29th, 2025
|6501円
|-
|CX-05
|[[Random Booster Vol. 6]]
|April 26th, 2025
|1600円
|-
|CX-06
|[[Random Booster FoxBrush Select]]
|May 17th, 2025
|1600円
|-
|CX-11
|[[EmperorMight Deck Set]]
|November 1st, 2025
|5000円
|-
|CX-16
|[[Start Dash Set C]]
|March 28th, 2026
|5650円
|}`;

// Bloco à parte: as linhas CX-00 não são contíguas na wiki real (intercaladas
// com BX-00/UX-00), mas cada bloco de linha é analisado isoladamente — a
// ordem entre blocos não citados aqui não afeta o teste.
const LINHAS_CX00 = `|-
|CX-00
|[[ValkyrieVolt S4-70V]] (Metal Coat: Gold)
|July 17th, 2025 ([[Rare Bey Get Battle]])
|N/A
|-
|CX-00
|Booster [[LeonFang T4-60A]] (Red Ver.)
|November 13th, 2025 (Included with ''[[Beyblade X: Evobattle]]'' (Nintendo Switch Package Edition))
|8228円
|-
|CX-00
|Booster [[HornetFortR7-60T]] (Metal Coat: Yellow)
|July 9th, 2026
|1800円
|-
|CX-00
|[[Evangelion Deck Set]]
|August 29th, 2026
|7500円
|-
|CX-00
|Starter [[TigaRage FT3-60T]]
|September 12th, 2026
|2750円`;

// Prova do "primeiro casamento vence": DranBrave S6-60V aparece DUAS vezes no
// índice real — o lançamento original (CX-01, Starter, 2025) e uma reedição
// Takara Tomy Mall Exclusive quase um ano e meio depois (CX-00, Booster,
// 2026). A tabela `beyblades` registra o produto como saiu de fábrica; a
// reedição não é um produto novo.
const TABELA_COM_REEDICAO = `|-
|CX-01
|Starter [[DranBrave S6-60V]]
|March 29th, 2025
|2200円
|-
|CX-00
|Booster [[DranBrave S6-60V]] (Metal Coat: Black)
|May 29th, 2026 (Takara Tomy Mall Exclusive)
|1800円`;

describe("analisarIndice", () => {
  it("lê código, rótulo, nome e data crua de cada linha", () => {
    const entradas = analisarIndice(TABELA_CX);
    expect(entradas).toContainEqual({
      codigo: "CX-01", rotulo: "Starter", nome: "DranBrave S6-60V", dataCrua: "March 29th, 2025",
    });
    expect(entradas).toContainEqual({
      codigo: "CX-03", rotulo: "Booster", nome: "PerseusDark B6-80W", dataCrua: "March 29th, 2025",
    });
  });

  it("linha sem rótulo (nome de set) tem rótulo vazio, não um traço", () => {
    const entradas = analisarIndice(TABELA_CX);
    const cx04 = entradas.find((e) => e.codigo === "CX-04");
    expect(cx04).toEqual({
      codigo: "CX-04", rotulo: "", nome: "Battle Entry Set C", dataCrua: "March 29th, 2025",
    });
  });

  it("ignora a linha de cabeçalho (células com ! em vez de |)", () => {
    const entradas = analisarIndice(TABELA_CX);
    expect(entradas.some((e) => e.codigo.includes("Code"))).toBe(false);
  });

  it("texto entre colchetes depois do link (ex.: '(Metal Coat: Gold)') não entra no nome", () => {
    const entradas = analisarIndice(LINHAS_CX00);
    const valkyrie = entradas.find((e) => e.nome === "ValkyrieVolt S4-70V");
    expect(valkyrie).toBeDefined();
    expect(valkyrie!.rotulo).toBe("");
  });

  it("nome sem espaço na wiki (HornetFortR7-60T) é preservado cru — a normalização é responsabilidade do lookup", () => {
    const entradas = analisarIndice(LINHAS_CX00);
    expect(entradas.some((e) => e.nome === "HornetFortR7-60T")).toBe(true);
  });
});

describe("converterData", () => {
  it("converte 'March 29th, 2025' para '2025-03-29'", () => {
    expect(converterData("March 29th, 2025")).toBe("2025-03-29");
  });

  it("lida com os quatro sufixos ordinais (1st, 2nd, 3rd, 29th)", () => {
    expect(converterData("July 1st, 2026")).toBe("2026-07-01");
    expect(converterData("January 2nd, 2026")).toBe("2026-01-02");
    expect(converterData("August 3rd, 2025")).toBe("2025-08-03");
    expect(converterData("March 29th, 2025")).toBe("2025-03-29");
  });

  it("data com contexto entre parênteses ainda converte — a data é a parte que abre a célula", () => {
    expect(converterData("July 17th, 2025 ([[Rare Bey Get Battle]])")).toBe("2025-07-17");
    expect(converterData(
      "November 13th, 2025 (Included with ''[[Beyblade X: Evobattle]]'' (Nintendo Switch Package Edition))",
    )).toBe("2025-11-13");
  });

  it("célula sem formato de data reconhecível devolve null, não uma data inventada", () => {
    expect(converterData("N/A")).toBeNull();
    expect(converterData("")).toBeNull();
  });
});

describe("tipoDaEntrada", () => {
  it("rótulo Starter determina starter", () => {
    expect(tipoDaEntrada({ codigo: "CX-01", rotulo: "Starter", nome: "DranBrave S6-60V", dataCrua: "" }))
      .toEqual({ determinado: true, tipo: "starter" });
  });

  it("rótulo Booster determina booster", () => {
    expect(tipoDaEntrada({ codigo: "CX-03", rotulo: "Booster", nome: "PerseusDark B6-80W", dataCrua: "" }))
      .toEqual({ determinado: true, tipo: "booster" });
  });

  it("sem rótulo, nome começando com 'Random Booster' determina random_booster", () => {
    expect(tipoDaEntrada({
      codigo: "CX-05", rotulo: "", nome: "Random Booster Vol. 6", dataCrua: "",
    })).toEqual({ determinado: true, tipo: "random_booster" });
  });

  it("sem rótulo, nome terminando em 'Deck Set' determina deck_set", () => {
    expect(tipoDaEntrada({
      codigo: "CX-11", rotulo: "", nome: "EmperorMight Deck Set", dataCrua: "",
    })).toEqual({ determinado: true, tipo: "deck_set" });
  });

  it("Battle Entry Set C não é Starter/Booster nem casa random_booster/deck_set — indeterminado, não 'other'", () => {
    expect(tipoDaEntrada({ codigo: "CX-04", rotulo: "", nome: "Battle Entry Set C", dataCrua: "" }))
      .toEqual({ determinado: false });
  });

  it("Start Dash Set C — mesma classe do Battle Entry Set C, também indeterminado", () => {
    expect(tipoDaEntrada({ codigo: "CX-16", rotulo: "", nome: "Start Dash Set C", dataCrua: "" }))
      .toEqual({ determinado: false });
  });

  it("nome de bey sem rótulo (reedição/evento) também é indeterminado, não vira 'other'", () => {
    expect(tipoDaEntrada({
      codigo: "CX-00", rotulo: "", nome: "ValkyrieVolt S4-70V", dataCrua: "",
    })).toEqual({ determinado: false });
  });
});

describe("consultarIndice", () => {
  it("encontra por nome exato e devolve tipo determinado + data convertida", () => {
    const entradas = analisarIndice(TABELA_CX);
    const consulta = consultarIndice(entradas, "DranBrave S6-60V");
    expect(consulta).not.toBeNull();
    expect(consulta!.tipo).toEqual({ determinado: true, tipo: "starter" });
    expect(consulta!.data).toBe("2025-03-29");
  });

  it("tolera a falta de espaço que a wiki às vezes escreve — HornetFortR7-60T casa com 'HornetFort R7-60T'", () => {
    const entradas = analisarIndice(LINHAS_CX00);
    const consulta = consultarIndice(entradas, "HornetFort R7-60T");
    expect(consulta).not.toBeNull();
    expect(consulta!.entrada.nome).toBe("HornetFortR7-60T");
    expect(consulta!.tipo).toEqual({ determinado: true, tipo: "booster" });
  });

  it("produto ausente do índice devolve null — não 'other', não uma data inventada", () => {
    const entradas = analisarIndice(TABELA_CX);
    expect(consultarIndice(entradas, "EmperorMight HOp")).toBeNull();
  });

  it("entrada encontrada mas com tipo indeterminado ainda devolve a data (ValkyrieVolt)", () => {
    const entradas = analisarIndice(LINHAS_CX00);
    const consulta = consultarIndice(entradas, "ValkyrieVolt S4-70V");
    expect(consulta).not.toBeNull();
    expect(consulta!.tipo).toEqual({ determinado: false });
    expect(consulta!.data).toBe("2025-07-17");
  });

  it("nome repetido no índice: o PRIMEIRO casamento (lançamento original) vence, não a reedição", () => {
    const entradas = analisarIndice(TABELA_COM_REEDICAO);
    const consulta = consultarIndice(entradas, "DranBrave S6-60V");
    expect(consulta).not.toBeNull();
    expect(consulta!.entrada.codigo).toBe("CX-01");
    expect(consulta!.tipo).toEqual({ determinado: true, tipo: "starter" });
    expect(consulta!.data).toBe("2025-03-29");
  });
});

// Recorte real da página "Random Booster Vol. 6" (lido em 2026-09-10) — a
// seção ==Assortment== inteira, mais o começo de ==Breakdown== e ==Gallery==
// (Videos/Trivia/References cortados, não mudam o que os testes verificam).
// Prova o "para no próximo cabeçalho": o Breakdown cita os MESMOS 6 beys,
// com prefixo "**" (que também bate a checagem de "linha de lista") — se a
// extração vazasse pra lá, o resultado teria 12 itens em vez de 6.
const PAGINA_RANDOM_BOOSTER_VOL_6 = `==Assortment==
Each individual booster will contain '''1 of the following Beyblades'''. Parts marked in '''bold''' are new to the series.
*CX-05 01: [[HellsReaper T4-70K|'''HellsReaper T'''4-70'''K''']] (Prize)
*CX-05 02: [[RhinoReaper C4-55D|'''RhinoReaper C'''4-55D]] (Prize)
*CX-05 03: [[HellsArc T3-85O|'''Hells'''Arc '''T'''3-85O]]
*CX-05 04: [[LeonCrest 9-80K|LeonCrest 9-80'''K''']]
*CX-05 05: [[PhoenixRudder 4-70LF]]
*CX-05 06: [[WhaleWave 7-60K|WhaleWave 7-60'''K''']]

==Breakdown==
*A factory sealed master carton contains 24 individual boosters, grouped into 4 "bags" (6 boosters × 4 bags). Each carton of 24 boosters contains:
**3 [[HellsReaper T4-70K]]
**4 [[RhinoReaper C4-55D]]
**5 [[HellsArc T3-85O]]
**4 [[LeonCrest 9-80K]]
**4 [[PhoenixRudder 4-70LF]]
**4 [[WhaleWave 7-60K]]

==Gallery==
<gallery widths="130">
X Random Booster Vol. 6 Contents.jpeg|The possible contents of the Random Booster.
HellsReaper T4-70K.png|HellsReaper T4-70K (CX-05 01)
</gallery>`;

// Recorte real da página "Evangelion Deck Set" (lido em 2026-09-10) — a
// mesma citada no relato da tarefa. Prova que ==Contents== mistura bey com
// item que NÃO é bey (dois "Winder Launcher", uma "Beyblade Storage Box") e
// que o módulo devolve os dois sem filtrar — quem filtra é o chamador.
const PAGINA_EVANGELION_DECK_SET = `==Contents==
* [[EvaArc B0-70E]] (Unit-00 Version Metal Coat: Orange)
* [[EvaBrave A1-70V]] (Unit-01 Version Metal Coat: Violet)
* [[EvaBrush T2-70A]] (Unit-02 Version Metal Coat: Red)
* [[Winder Launcher]] (Launch Version + Long Winder)
* [[Winder Launcher]] (NERV Version + Long Winder)
* [[Beyblade Storage Box]]

==Gallery==
===Takara Tomy===
<gallery widths="130">
Evangelion Deck Set Contents.png|Contents
</gallery>`;

describe("itensDoConjunto", () => {
  it("extrai os alvos de link da seção Assortment (Random Booster), ignorando sub-código e '(Prize)'", () => {
    expect(itensDoConjunto(PAGINA_RANDOM_BOOSTER_VOL_6)).toEqual([
      "HellsReaper T4-70K", "RhinoReaper C4-55D", "HellsArc T3-85O",
      "LeonCrest 9-80K", "PhoenixRudder 4-70LF", "WhaleWave 7-60K",
    ]);
  });

  it("para no próximo cabeçalho (==Breakdown==) — não duplica os mesmos beys citados lá", () => {
    expect(itensDoConjunto(PAGINA_RANDOM_BOOSTER_VOL_6)).toHaveLength(6);
  });

  it("extrai os alvos de link da seção Contents (Deck Set), incluindo item que não é bey", () => {
    expect(itensDoConjunto(PAGINA_EVANGELION_DECK_SET)).toEqual([
      "EvaArc B0-70E", "EvaBrave A1-70V", "EvaBrush T2-70A",
      "Winder Launcher", "Winder Launcher", "Beyblade Storage Box",
    ]);
  });

  it("página sem seção Assortment nem Contents devolve lista vazia, não lança", () => {
    expect(itensDoConjunto(TABELA_CX)).toEqual([]);
  });
});

describe("entradasDeConjunto", () => {
  it("filtra as entradas cujo tipo é random_booster ou deck_set, com o tipo já resolvido", () => {
    const entradas = analisarIndice(TABELA_CX);
    const conjuntos = entradasDeConjunto(entradas)
      .map((c) => ({ codigo: c.entrada.codigo, nome: c.entrada.nome, tipo: c.tipo }));
    expect(conjuntos).toEqual([
      { codigo: "CX-05", nome: "Random Booster Vol. 6", tipo: "random_booster" },
      { codigo: "CX-06", nome: "Random Booster FoxBrush Select", tipo: "random_booster" },
      { codigo: "CX-11", nome: "EmperorMight Deck Set", tipo: "deck_set" },
    ]);
  });

  it("exclui entradas rotuladas (Starter/Booster) e as indeterminadas (Battle Entry Set C, Start Dash Set C)", () => {
    const entradas = analisarIndice(TABELA_CX);
    const codigos = entradasDeConjunto(entradas).map((c) => c.entrada.codigo);
    expect(codigos).not.toContain("CX-01");
    expect(codigos).not.toContain("CX-03");
    expect(codigos).not.toContain("CX-04");
    expect(codigos).not.toContain("CX-16");
  });
});

describe("mesmoNome", () => {
  it("ignora espaço e caixa — mesma tolerância que consultarIndice já usa", () => {
    expect(mesmoNome("HornetFortR7-60T", "HornetFort R7-60T")).toBe(true);
    expect(mesmoNome("evaarc b0-70e", "EvaArc B0-70E")).toBe(true);
  });

  it("nomes diferentes não casam", () => {
    expect(mesmoNome("EvaArc B0-70E", "EvaBrave A1-70V")).toBe(false);
  });
});
