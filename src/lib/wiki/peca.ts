import {
  GIRO, LINHA_POR_SISTEMA, TIPO,
  gramas, lerInfobox, primeiroValor, statNumerico, temDoisModos,
} from "./infobox.ts";
import type { PartSlot } from "../engine/types.ts";

/** `Classification` do infobox → slot do catálogo. */
const SLOT_POR_CLASSE: Record<string, PartSlot> = {
  "Lock Chip": "lock_chip",
  "Main Blade": "main_blade",
  "Metal Blade": "metal_blade",
  "Over Blade": "over_blade",
  "Assist Blade": "assist_blade",
  "Blade": "blade",
  "Ratchet-Integrated Blade": "integrated_blade",
  "Ratchet": "ratchet",
  "Ratchet-Integrated Bit": "integrated_bit",
  "Bit": "bit",
};

/**
 * Slots cuja classe NÃO pontua.
 *
 * O Lock Chip prende a Main Blade na Assist Blade; não é ponto de contato.
 * Verificado nas 28 páginas: nenhuma declara AttackStat, DefenseStat,
 * StaminaStat nem Type (spec §3). Zero aqui é a natureza da peça, não lacuna —
 * e é por isso que não vira marca de revisão.
 */
const SLOTS_QUE_NAO_PONTUAM: readonly PartSlot[] = ["lock_chip"];

/** Slots que carregam sentido de giro: só a lâmina principal (spec §4.4). */
const LAMINAS_PRINCIPAIS: readonly PartSlot[] = [
  "blade", "integrated_blade", "main_blade", "metal_blade",
];

export type PecaColetada = {
  slot: PartSlot;
  brand: "takara_tomy" | "hasbro";
  name: string;
  line: "BX" | "UX" | "CX";
  attack: number;
  defense: number;
  stamina: number;
  weight_g: number | null;
  height_mm: number | null;
  spin_direction: "right" | "left" | "dual" | null;
  part_type: "attack" | "defense" | "stamina" | "balance" | null;
  aka: string[] | null;
  source_url: string;
  notes: string | null;
  data_disputed: boolean;
};

const urlDoTitulo = (t: string) =>
  "https://beyblade.fandom.com/wiki/" + t.replace(/ /g, "_");

/**
 * Marca da peça a partir do `ProductCode`.
 *
 * Rótulo explícito manda: "(Takara Tomy)" ou "(Hasbro)" escrito no próprio
 * código. Sem rótulo, decide o FORMATO do código — `BX-`, `UX-` ou `CX-`
 * seguido de dígitos é Takara Tomy; `G` seguido de dígitos é Hasbro. Nem
 * rótulo nem formato reconhecível: lança, nomeando a página e o código, em
 * vez de adivinhar.
 *
 * Medido nas 103 peças reais da Custom Line, isso resolve todas — nenhuma
 * cai no `throw`. A leitura antiga ("sem rótulo Takara Tomy = hasbro")
 * classificava errado 22 dessas 103: todo código `CX-NN` sem rótulo, que é
 * exatamente o formato Takara Tomy sem rótulo.
 */
function marcaDaPeca(titulo: string, codigo: string): "takara_tomy" | "hasbro" {
  if (/\(Takara Tomy\)/.test(codigo)) return "takara_tomy";
  if (/\(Hasbro\)/.test(codigo)) return "hasbro";
  if (/\b(?:BX|UX|CX)-\d/.test(codigo)) return "takara_tomy";
  if (/\bG\d/.test(codigo)) return "hasbro";
  throw new Error(
    `${titulo}: não dá para determinar a marca a partir de ProductCode "${codigo}"`,
  );
}

/**
 * Os dois números de um stat com dois modos ("30 > 55" ou "20/50"), na ordem
 * publicada. Só chamar quando `temDoisModos` for true para o mesmo valor.
 */
function doisValores(bruto: string): [number, number] {
  const numeros = bruto.match(/-?\d+(\.\d+)?/g);
  if (!numeros || numeros.length < 2) {
    throw new Error(`esperava dois valores numéricos em "${bruto}"`);
  }
  return [Number(numeros[0]), Number(numeros[1])];
}

export function pecaDaPagina(titulo: string, wikitext: string): PecaColetada {
  const box = lerInfobox(wikitext);

  const classe = box.get("Classification") ?? "";
  const slot = SLOT_POR_CLASSE[classe];
  if (!slot) throw new Error(`${titulo}: Classification desconhecida "${classe}"`);

  const sistema = box.get("System") ?? "";
  const line = LINHA_POR_SISTEMA[sistema];
  if (!line) throw new Error(`${titulo}: System desconhecido "${sistema}"`);

  const bruto = {
    attack: box.get("AttackStat") ?? "",
    defense: box.get("DefenseStat") ?? "",
    stamina: box.get("StaminaStat") ?? "",
  };
  const lido = {
    attack: statNumerico(bruto.attack),
    defense: statNumerico(bruto.defense),
    stamina: statNumerico(bruto.stamina),
  };

  const naoPontua = SLOTS_QUE_NAO_PONTUAM.includes(slot);
  const semStats = lido.attack === null && lido.defense === null && lido.stamina === null;

  const notas: string[] = [];
  if (semStats && !naoPontua) {
    notas.push(
      "A fonte não publica os atributos desta peça. Os zeros exibidos são "
      + "ausência de dado, não medição.",
    );
  }
  if (Object.values(bruto).some(temDoisModos)) {
    // Precedente do Hells Nether (UX-21): grava-se o PRIMEIRO modo nas
    // colunas e explicam-se os dois em `notes`, agrupados por modo (um
    // trio ataque/defesa/resistência por vez) — não um par por stat, que lido
    // em português soa como desigualdade falsa ("30 > 55" parece dizer que
    // trinta é maior que cinquenta e cinco). `notes` é lido por uma criança,
    // então o texto sai por extenso, sem o `>` ou o `/` crus da wiki.
    const [ataque1, ataque2] = doisValores(bruto.attack);
    const [defesa1, defesa2] = doisValores(bruto.defense);
    const [resistencia1, resistencia2] = doisValores(bruto.stamina);
    notas.push(
      "A fonte publica dois conjuntos de atributos para esta peça: no primeiro "
      + `modo, ataque ${ataque1}, defesa ${defesa1} e resistência ${resistencia1}; `
      + `no segundo modo, ataque ${ataque2}, defesa ${defesa2} e resistência `
      + `${resistencia2}. O modo exibido no resto desta ficha é o primeiro.`,
    );
  }

  // O nome canônico deste catálogo é o da Takara Tomy — mas nem toda página
  // está publicada sob esse nome. Duas formas reais, e o rótulo de marca do
  // PRÓPRIO campo é quem decide, nunca o título da página:
  //
  //  - "Courage (Hasbro)": a página já está sob o nome Takara Tomy (`Name`),
  //    e o AKA guarda só o nome Hasbro. Vira `aka`; `Name` fica como está.
  //  - "Bucks (Takara Tomy)" na página "Stag": a wiki publicou esta página
  //    sob o nome HASBRO, e é o AKA rotulado (Takara Tomy) que carrega o
  //    nome canônico. Aqui os dois trocam de lugar — o AKA vira `name`, e o
  //    `Name` da página vira uma entrada de `aka`.
  //
  // Não é hipotético: numa onda anterior essa mesma confusão inverteu o nome
  // de três lâminas, porque o código confiava no título da página em vez de
  // ler o rótulo de marca do campo. Entradas de AKA sem rótulo (~15 de 17,
  // medido: siglas como "GR"/"GU"/"LO"/"Nr"/"TK" e romanizações como "Five
  // Fifty") são descartadas — não viram nome de peça nenhum.
  let name = box.get("Name") || titulo.replace(/^.*? - /, "");
  const aka: string[] = [];
  for (const entrada of (box.get("AKA") ?? "").split(/<br\s*\/?>/i)) {
    const hasbro = entrada.match(/^(.+?)\s*\(Hasbro\)\s*$/);
    if (hasbro) {
      aka.push(hasbro[1]!.trim());
      continue;
    }
    const takaraTomy = entrada.match(/^(.+?)\s*\(Takara Tomy\)\s*$/);
    if (takaraTomy) {
      aka.push(name);
      name = takaraTomy[1]!.trim();
    }
  }

  const codigo = box.get("ProductCode") ?? "";

  return {
    slot,
    brand: marcaDaPeca(titulo, codigo),
    name,
    line,
    attack: lido.attack ?? 0,
    defense: lido.defense ?? 0,
    stamina: lido.stamina ?? 0,
    weight_g: gramas(box.get("Weight") ?? ""),
    height_mm: statNumerico(box.get("HeightStat") ?? ""),
    spin_direction: LAMINAS_PRINCIPAIS.includes(slot)
      ? (GIRO[primeiroValor(box.get("SpinDirection") ?? "")] ?? null)
      : null,
    part_type: TIPO[box.get("Type") ?? ""] ?? null,
    aka: aka.length ? aka : null,
    source_url: urlDoTitulo(titulo),
    notes: notas.length ? notas.join(" ") : null,
    data_disputed: semStats && !naoPontua,
  };
}
