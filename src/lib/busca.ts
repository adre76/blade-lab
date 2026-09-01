/**
 * Casamento de texto da busca do catálogo.
 *
 * Mora fora do componente porque tem duas regras que precisam de garantia e
 * não se vê olhando a tela:
 *
 *   1. **os dois idiomas casam.** A interface diz "Catraca" e "Ponta", mas a
 *      comunidade, as listas de produto e as lojas dizem "ratchet" e "bit".
 *      Se a tradução tirasse os termos em inglês da busca, ela pioraria o
 *      catálogo em vez de melhorar.
 *   2. **acento não atrapalha.** Num catálogo em português, quem digita
 *      "lamina" espera achar "Lâmina".
 */

/** Minúsculas e sem acento, dos dois lados da comparação. */
export const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Palavras da busca, já normalizadas. Vazio quando o usuário não digitou nada. */
export const termosDaBusca = (texto: string): string[] =>
  semAcento(texto.trim()).split(/\s+/).filter(Boolean);

/**
 * Todo termo tem de aparecer em algum lugar do índice, em qualquer ordem.
 *
 * Comparar a frase inteira como substring — que era o que havia antes —
 * exigiria que os termos fossem vizinhos: "ponta Low Flat" falharia, porque o
 * nome da peça e a classe dela nunca ficam colados no índice.
 */
export function casaTermos(indice: string, termos: string[]): boolean {
  if (!termos.length) return true;
  const alvo = semAcento(indice);
  return termos.every((t) => alvo.includes(t));
}
