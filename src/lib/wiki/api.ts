/**
 * Conversa com a API da Beyblade Wiki (MediaWiki).
 *
 * `buscar` entra por parâmetro em vez de a função chamar `fetch` direto: é o
 * que permite testar a reindexação de redirect e o loteamento sem rede — e a
 * suíte inteira roda em menos de meio segundo porque nada aqui sai da máquina.
 */
const BASE = "https://beyblade.fandom.com/api.php";

/** Teto da API para consulta por título numa requisição só. */
const LOTE = 50;

export type Busca = (url: string) => Promise<unknown>;

export const buscarNaRede: Busca = async (url) => (await fetch(url)).json();

type RespostaPaginas = {
  query?: {
    redirects?: { from: string; to: string }[];
    pages?: Record<string, {
      title: string;
      missing?: unknown;
      revisions?: { slots?: { main?: { "*"?: string } } }[];
    }>;
  };
};

/**
 * Anda a cadeia de redirects de trás para frente, do título de destino até o
 * título originalmente pedido.
 *
 * `redirects=1` resolve a cadeia inteira num pedido só, mas devolve um hop
 * por salto — para A→B→C a resposta traz [{A,B},{B,C}] e a página vem
 * indexada em "C". Um LOOKUP único (`destinoDoPedido.get(p.title)`) acha só
 * "B", um título intermediário que ninguém pediu; quem pediu "A" não encontra
 * nada, em silêncio. Por isso isto é um LOOP, não um lookup.
 *
 * `paraDe` mapeia destino → origem de cada hop. `paraDe.size` é o teto seguro
 * de passos: uma cadeia real não tem mais saltos do que hops existem na
 * resposta, e o mesmo teto impede um ciclo (A→B→A, que não devia existir na
 * wiki, mas se existir) de girar para sempre.
 */
function tituloPedido(tituloFinal: string, paraDe: Map<string, string>): string {
  let atual = tituloFinal;
  for (let passo = 0; passo < paraDe.size; passo++) {
    const anterior = paraDe.get(atual);
    if (anterior === undefined) break;
    atual = anterior;
  }
  return atual;
}

/**
 * Wikitext de cada título, indexado pelo título **pedido**.
 *
 * A reindexação não é detalhe: metade das lâminas tem a página sob o nome
 * Hasbro, com o nome Takara Tomy como redirect. Indexar pelo título de destino
 * faria quem pediu "GoatTackle" não achar nada — em silêncio.
 */
export async function paginas(titulos: string[], buscar: Busca): Promise<Map<string, string>> {
  const saida = new Map<string, string>();

  for (let i = 0; i < titulos.length; i += LOTE) {
    const fatia = titulos.slice(i, i + LOTE);
    const url = `${BASE}?format=json&action=query&prop=revisions`
      + `&rvprop=content&rvslots=main&redirects=1`
      + `&titles=${fatia.map(encodeURIComponent).join("|")}`;

    const r = (await buscar(url)) as RespostaPaginas;
    const paraDe = new Map<string, string>();
    for (const { from, to } of r.query?.redirects ?? []) paraDe.set(to, from);

    for (const p of Object.values(r.query?.pages ?? {})) {
      const texto = p.revisions?.[0]?.slots?.main?.["*"];
      // Página existente com wikitext vazio ("") cai no mesmo `continue` que
      // página inexistente — deliberado: não há conteúdo pra coletar nos dois
      // casos, e distinguir os dois exigiria um terceiro estado que nada aqui
      // consome.
      if (p.missing !== undefined || !texto) continue;
      saida.set(tituloPedido(p.title, paraDe), texto);
    }
  }

  return saida;
}

type RespostaCategoria = {
  query?: { categorymembers?: { title: string }[] };
  continue?: unknown;
};

/**
 * Teto medido em 2026-09-10: Custom Line Beyblades 50, Unique Line Beyblades
 * 53, Basic Line Beyblades 181 — todas bem abaixo do `cmlimit=500`. Por isso
 * paginar aqui seria construir para um risco que não existe hoje; em vez
 * disso, se a wiki algum dia sinalizar `continue` (categoria > 500 membros),
 * a função estoura em vez de devolver uma lista truncada em silêncio.
 */
export async function membrosDaCategoria(
  categoria: string, buscar: Busca,
): Promise<string[]> {
  const url = `${BASE}?format=json&action=query&list=categorymembers&cmlimit=500`
    + `&cmtitle=${encodeURIComponent("Category:" + categoria)}`;
  const r = (await buscar(url)) as RespostaCategoria;
  if (r.continue !== undefined) {
    throw new Error(
      `membrosDaCategoria: "${categoria}" passou do teto de 500 membros `
      + `(a resposta trouxe "continue") — paginação é necessária.`,
    );
  }
  return (r.query?.categorymembers ?? []).map((m) => m.title);
}
