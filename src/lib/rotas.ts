/**
 * Para onde vai uma visita à raiz, olhando só a querystring.
 *
 * Até a landing existir, `/` ERA o catálogo, e os links compartilhados apontam
 * para lá com filtro na querystring — foi exatamente para isso que a Onda 1 pôs
 * o filtro na URL. Mover o catálogo sem tratar esses links desmentiria aquela
 * decisão.
 *
 * Não é medida de transição: a querystring é o sinal de que aquele link foi
 * feito para uma tela específica, e continua sendo.
 *
 * Devolve `null` quando não há para onde mandar — aí a raiz mostra a landing.
 */
const DO_CATALOGO = ["q", "tipo", "raridade"];
const DO_LABORATORIO = ["combo"];

export function destinoDaRaiz(busca: string): string | null {
  const params = new URLSearchParams(busca);
  const tem = (chaves: string[]) => chaves.some((c) => params.has(c));

  // O laboratório vem primeiro: um link com `combo` é dele, mesmo que carregue
  // algum resto de filtro de catálogo.
  if (tem(DO_LABORATORIO)) return `/lab?${params.toString()}`;
  if (tem(DO_CATALOGO)) return `/catalogo?${params.toString()}`;
  return null;
}
