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
    notas.push(
      `A fonte publica dois conjuntos de atributos para esta peça, `
      + `${bruto.attack}, ${bruto.defense} e ${bruto.stamina}, o que indica dois `
      + `modos de montagem; o exibido aqui é o primeiro.`,
    );
  }

  // O nome Hasbro vem rotulado: "Courage (Hasbro)". Sem o rótulo não dá para
  // saber de quem é o nome — foi o que inverteu três lâminas na Onda 1.
  const aka = (box.get("AKA") ?? "")
    .split(/<br\s*\/?>/i)
    .map((s) => s.match(/^(.+?)\s*\(Hasbro\)\s*$/)?.[1]?.trim())
    .filter((s): s is string => Boolean(s));

  const codigo = box.get("ProductCode") ?? "";

  return {
    slot,
    brand: /\(Takara Tomy\)/.test(codigo) ? "takara_tomy" : "hasbro",
    name: box.get("Name") ?? titulo.replace(/^.*? - /, ""),
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
