/**
 * Funde a coleta fresca da wiki com o que já existe em `data/`.
 *
 * A pergunta que este módulo responde: quando `scripts/coletar.ts` roda de
 * novo sobre uma linha já coletada, o que sobrevive e o que é substituído?
 * Antes deste módulo, a resposta era "nada sobrevive" — um registro fresco
 * substituía o existente por inteiro, apagando em silêncio qualquer campo
 * curado à mão (`release_type`, `rarity`, `rarity_reason`) ou escrito por
 * outro script (`scripts/seed-images.ts` grava `image_path`). Um coletor que
 * destrói curadoria a cada recoleta é pior que nenhum coletor.
 *
 * Migrado para `src/lib/seed/` para poder ser testado: `vite.config.ts`
 * restringe a suíte a `src/**\/*.test.ts`, e nada em `scripts/` roda nela.
 */

/**
 * Chave natural de uma peça: `brand|slot|name`.
 *
 * TEM QUE bater com o `onConflict: "brand,slot,name"` de `scripts/seed.ts`
 * — são os dois lados do mesmo upsert, um em `data/`, o outro no banco. Se
 * divergirem, um registro que o seed trata como "o mesmo" a coleta passaria
 * a tratar como dois.
 */
export function chaveDePeca(r: { brand?: string | null; slot: string; name: string }): string {
  return `${r.brand ?? "takara_tomy"}|${r.slot}|${r.name}`;
}

/**
 * Chave natural de um bey: `brand|release_code|name`.
 *
 * Mesma exigência de `chaveDePeca`: tem que bater com o
 * `onConflict: "brand,release_code,name"` de `scripts/seed.ts`.
 *
 * Antes de existirem estas duas funções separadas, `scripts/coletar.ts` tinha
 * UMA função que adivinhava qual campo usar (`r.slot ?? r.release_code`).
 * Funcionava porque peça nunca tem `release_code` e bey nunca tem `slot` —
 * coincidência, não garantia; o primeiro registro que ganhasse os dois campos
 * quebraria a adivinhação em silêncio, sem erro nenhum. Separar por tipo
 * elimina a adivinhação: cada função só sabe ler o campo do seu próprio tipo.
 */
export function chaveDeBey(r: { brand?: string | null; release_code: string; name: string }): string {
  return `${r.brand ?? "takara_tomy"}|${r.release_code}|${r.name}`;
}

/**
 * Campos que o coletor PRODUZ para uma peça — exatamente o formato de
 * retorno de `pecaDaPagina` (`src/lib/wiki/peca.ts`, tipo `PecaColetada`).
 *
 * Todo campo de `PartSchema` (`src/lib/seed/schema.ts`) fora desta lista —
 * `code`, `contact_points`, `burst_resistance`, `dash_performance`,
 * `equivalent_name`, `image_path`, `image_source_url` — não vem do infobox
 * da wiki: é curado à mão ou escrito por outro script
 * (`scripts/seed-images.ts` grava `image_path`/`image_source_url`). Por isso
 * NUNCA é sobrescrito por uma recoleta.
 */
export const CAMPOS_DA_PECA = [
  "slot", "brand", "name", "line", "attack", "defense", "stamina",
  "weight_g", "height_mm", "spin_direction", "part_type", "aka",
  "source_url", "notes", "data_disputed",
] as const;

/**
 * Campos que o coletor PRODUZ para um bey — o formato de retorno de
 * `beyDaPagina` (`src/lib/wiki/bey.ts`, tipo `BeyColetado`), com `parts` já
 * reformatada de lista para objeto slot→nome (a mesma reforma que
 * `scripts/coletar.ts` fazia antes de gravar).
 *
 * Note a ausência de `notes` e `data_disputed`: ao contrário da peça, o
 * coletor de bey nunca os produz — `beyDaPagina` não os devolve. Eles ficam
 * do lado curado da linha, junto com `release_type`, `release_date`,
 * `rarity`, `rarity_reason`, `equivalent_code`, `image_path` e
 * `image_source_url` (todos em `BeybladeSchema`, nenhum em `BeyColetado`).
 */
export const CAMPOS_DO_BEY = [
  "release_code", "name", "line", "anatomy", "brand", "bey_type",
  "spin_direction", "aka", "source_url", "parts",
] as const;

/**
 * Funde UM registro fresco com o que já existia sob a mesma chave.
 *
 * Campo listado em `campos` (o coletor produz): vem sempre do fresco —
 * inclusive quando o valor fresco é `null`. Uma peça que perdeu o peso
 * publicado tem que MOSTRAR isso (`weight_g: null`), não guardar um número
 * obsoleto só porque `null` parece "sem novidade".
 *
 * Campo fora de `campos`: vem sempre do existente. É curado à mão ou escrito
 * por outro script, e esta rodada de coleta nem sabe que ele existe —
 * sobrescrever apagaria trabalho que esta função nunca viu.
 *
 * Sem existente correspondente: o fresco inteiro, sem fusão — não há nada
 * para preservar.
 */
export function fundirRegistro<T extends Record<string, unknown>>(
  existente: T | undefined,
  fresco: T,
  campos: readonly string[],
): T {
  if (!existente) return fresco;
  const fundido: Record<string, unknown> = { ...existente };
  for (const campo of campos) fundido[campo] = fresco[campo];
  return fundido as T;
}

/**
 * Funde a lista de registros frescos da coleta com a lista já existente no
 * arquivo, casando por chave natural.
 *
 * `data/` é upsert-only (spec): nada aqui apaga. Um registro só em
 * `existentes` sobrevive intacto; um registro só em `frescos` entra novo; um
 * registro presente nos dois lados passa por `fundirRegistro`.
 */
export function fundirRegistros<T extends Record<string, unknown>>(
  existentes: readonly T[],
  frescos: readonly T[],
  chaveDe: (r: T) => string,
  campos: readonly string[],
): T[] {
  const mapa = new Map(existentes.map((r) => [chaveDe(r), r]));
  for (const fresco of frescos) {
    const chave = chaveDe(fresco);
    mapa.set(chave, fundirRegistro(mapa.get(chave), fresco, campos));
  }
  return [...mapa.values()];
}
