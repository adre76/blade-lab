import {
  GIRO, LINHA_POR_SISTEMA, TIPO,
  lerInfobox, marcaDoCodigo, nomeEAkaDoInfobox, primeiroValor,
} from "./infobox.ts";
import { CAMPO_POR_SLOT, anatomiaDe, pecasDoInfobox } from "./anatomia.ts";
import type { Anatomy, PartSlot } from "../engine/types.ts";

export type BeyColetado = {
  release_code: string;
  name: string;
  line: "BX" | "UX" | "CX";
  anatomy: Anatomy;
  brand: "takara_tomy" | "hasbro";
  bey_type: "attack" | "defense" | "stamina" | "balance" | null;
  spin_direction: "right" | "left" | "dual" | null;
  // Nome Hasbro perdido não é opção: a página "Fort Hornet R 7-60T" publica
  // exatamente esse nome sob o AKA, e é o único lugar onde ele sobrevive
  // depois que `name` promove o nome Takara Tomy. Mesmo campo, mesmo
  // formato de `PecaColetada.aka` (peca.ts) — nenhum consumidor a jusante
  // precisa saber se está lendo um registro de peça ou de bey.
  aka: string[] | null;
  source_url: string;
  parts: { slot: PartSlot; name: string }[];
};

/** Ordem em que os slots aparecem no infobox — de cima para baixo do bey. */
const ORDEM_DOS_SLOTS = Object.values(CAMPO_POR_SLOT);

export function beyDaPagina(titulo: string, wikitext: string): BeyColetado {
  const box = lerInfobox(wikitext);

  const sistema = box.get("System") ?? "";
  const line = LINHA_POR_SISTEMA[sistema];
  if (!line) throw new Error(`${titulo}: System desconhecido "${sistema}"`);

  const codigo = box.get("ProductCode") ?? "";
  // Página sem ProductCode nenhum não é um bey que chegou a ser vendido —
  // é uma combinação que só existe no anime/mangá, e a tabela `beyblades`
  // guarda o bey COMO SAIU DE FÁBRICA (spec §4.4). Os quatro casos reais da
  // Custom Line que caem aqui (DranBrave H6-60V, HellsReaper TOp,
  // WizardMight R4-55LO, WolfHunt F4-60T) não têm ProductCode, Price nem
  // data de lançamento — nenhum dos três —, e a prosa de cada página
  // confirma: aparecem só como combinação de anime/mangá; a WolfHunt
  // F4-60T chega a dizer, no próprio texto, "it was not released". Por
  // isso a checagem lança ANTES de chegar em `marcaDoCodigo`: um
  // ProductCode ausente não é um código indecifrável — não há marca
  // nenhuma para decifrar, porque não há produto. Se essa checagem
  // morasse dentro de `marcaDoCodigo` (compartilhada com `peca.ts`, onde
  // um código vazio genuinamente É um problema de marca), quem lê a lista
  // de descarte seria mandado investigar uma marca quando o fato é que a
  // página nunca foi um produto — diagnóstico errado, tempo perdido.
  if (!codigo.trim()) {
    throw new Error(
      `${titulo}: não é um produto lançado — sem ProductCode, é uma combinação `
      + `exclusiva de anime/mangá (sem Price nem data de lançamento). Não `
      + `pertence ao catálogo de produtos.`,
    );
  }

  // Nome canônico e AKA — mesma regra de `peca.ts` (`nomeEAkaDoInfobox`,
  // infobox.ts): quando o AKA carrega um rótulo "(Takara Tomy)" (ou
  // "([[Takara Tomy]])", como a própria página abaixo escreve), aquele nome
  // vira o `name` do registro, e o nome da página (que era o Hasbro) desce
  // para `aka`. Página real que forçou isto: "Fort Hornet R 7-60T" — a wiki
  // publica o bey sob o nome Hasbro, e o nome Takara Tomy ("HornetFort
  // R7-60T") só existe dentro do AKA.
  const { name, aka, nomeVeioDeAkaTakaraTomy } =
    nomeEAkaDoInfobox(titulo, box.get("AKA") ?? "");

  const brand = marcaDoCodigo(titulo, codigo, nomeVeioDeAkaTakaraTomy);

  // O código de lançamento segue a MESMA marca do registro — não a ordem em
  // que a wiki publica os valores. Quando `ProductCode` traz mais de um
  // valor separado por `<br>`, cada um rotulado, escolhe-se o que casa com
  // `brand` (já resolvida acima, inclusive quando veio de uma promoção de
  // AKA e não do rótulo do próprio ProductCode). Um único valor, ou nenhum
  // rótulo reconhecido entre os valores: comportamento de sempre — primeiro
  // valor, rótulo removido se houver algum. "Fort Hornet R 7-60T" é o caso
  // real que prova a necessidade: "G1682 (Hasbro)<br>CX-00 (Takara Tomy)"
  // tem o código Hasbro em primeiro lugar; sem escolher pela marca, o
  // `release_code` sairia "G1682" para um registro que é Takara Tomy.
  const rotuloDaMarca = brand === "takara_tomy" ? "Takara Tomy" : "Hasbro";
  const valoresDoCodigo = codigo.split(/<br\s*\/?>/i).map((v) => v.trim());
  const valorDaMarca = valoresDoCodigo.find((v) =>
    new RegExp(`\\(${rotuloDaMarca}\\)\\s*$`).test(v.replace(/\[\[|\]\]/g, "")));
  const releaseCode = (valorDaMarca ?? primeiroValor(codigo))
    .replace(/\[\[|\]\]/g, "")
    .replace(/\s*\((?:Takara Tomy|Hasbro)\)\s*$/, "")
    .trim();

  const pecas = pecasDoInfobox(box);

  return {
    release_code: releaseCode,
    name,
    line,
    anatomy: anatomiaDe(box),
    brand,
    bey_type: TIPO[box.get("Type") ?? ""] ?? null,
    spin_direction: GIRO[primeiroValor(box.get("SpinDirection") ?? "")] ?? null,
    aka,
    source_url: "https://beyblade.fandom.com/wiki/" + titulo.replace(/ /g, "_"),
    parts: [...pecas.entries()]
      .sort((a, b) => ORDEM_DOS_SLOTS.indexOf(a[0]) - ORDEM_DOS_SLOTS.indexOf(b[0]))
      .map(([slot, name]) => ({ slot, name })),
  };
}

/**
 * Confere o giro derivado das peças contra o que o bey declara.
 *
 * É a única verificação cruzada disponível para a regra de giro na CX: não há
 * nenhuma peça CX canhota publicada, então a precedência
 * `blade → integrated_blade → main_blade → metal_blade` nunca foi exercitada
 * contra um contraexemplo (spec §5.3). Se um dia sair uma CX canhota e a regra
 * estiver errada, é aqui que a coleta vai parar.
 *
 * Peça sem giro declarado não acusa: ausência de dado não é divergência.
 */
export function conferirGiro(bey: BeyColetado, giroDasPecas: string | null): void {
  if (!giroDasPecas || !bey.spin_direction) return;
  if (giroDasPecas !== bey.spin_direction) {
    throw new Error(
      `${bey.name}: o giro das peças (${giroDasPecas}) diverge do que o bey `
      + `declara (${bey.spin_direction}). Ou a página está errada, ou a regra `
      + `de precedência de giro do motor não vale para esta anatomia.`,
    );
  }
}
