import {
  GIRO, LINHA_POR_SISTEMA, TIPO, lerInfobox, marcaDoCodigo, primeiroValor,
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

  // Rótulo de marca só existe quando há mais de um código publicado
  // (Takara Tomy e Hasbro lado a lado); um código solto sem parênteses não
  // tem rótulo nenhum e a linha inteira é o código — o replace fica sem
  // efeito nesse caso, o que é o comportamento certo.
  const releaseCode = primeiroValor(codigo)
    .replace(/\s*\((?:Takara Tomy|Hasbro)\)\s*$/, "")
    .trim();

  const pecas = pecasDoInfobox(box);

  return {
    release_code: releaseCode,
    name: titulo,
    line,
    anatomy: anatomiaDe(box),
    // Beys não têm AKA a promover (só peças têm), então o argumento fica
    // sempre `false` — quem decide a marca é o rótulo/formato do código.
    brand: marcaDoCodigo(titulo, codigo, false),
    bey_type: TIPO[box.get("Type") ?? ""] ?? null,
    spin_direction: GIRO[primeiroValor(box.get("SpinDirection") ?? "")] ?? null,
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
