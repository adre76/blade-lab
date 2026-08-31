import bruto from "../../../data/anatomies.json";

/**
 * Composição de cada anatomia, lida de `data/anatomies.json`.
 *
 * Este módulo não importa nada do projeto de propósito: `schema.ts` e
 * `carregar.ts` dependem dele, e colocá-lo em qualquer um dos dois criaria um
 * ciclo entre eles.
 *
 * O arquivo carrega comentários em chaves iniciadas por `_` — o JSON não tem
 * sintaxe de comentário, e a procedência de uma correção precisa morar junto do
 * dado. Filtrar aqui, num lugar só, evita que cada consumidor tenha de lembrar
 * disso; foi justamente o esquecimento que quebrou o script de sync.
 */
export const ANATOMIAS: Record<string, string[]> = Object.fromEntries(
  Object.entries(bruto as Record<string, unknown>).filter(
    (entrada): entrada is [string, string[]] =>
      !entrada[0].startsWith("_") && Array.isArray(entrada[1]),
  ),
);

/** Slots exigidos por uma anatomia, ou lista vazia se ela não existir. */
export function slotsDaAnatomia(anatomia: string): string[] {
  return ANATOMIAS[anatomia] ?? [];
}
