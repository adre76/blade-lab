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
    const destinoDoPedido = new Map<string, string>();
    for (const { from, to } of r.query?.redirects ?? []) destinoDoPedido.set(to, from);

    for (const p of Object.values(r.query?.pages ?? {})) {
      const texto = p.revisions?.[0]?.slots?.main?.["*"];
      if (p.missing !== undefined || !texto) continue;
      saida.set(destinoDoPedido.get(p.title) ?? p.title, texto);
    }
  }

  return saida;
}

type RespostaCategoria = { query?: { categorymembers?: { title: string }[] } };

export async function membrosDaCategoria(
  categoria: string, buscar: Busca,
): Promise<string[]> {
  const url = `${BASE}?format=json&action=query&list=categorymembers&cmlimit=500`
    + `&cmtitle=${encodeURIComponent("Category:" + categoria)}`;
  const r = (await buscar(url)) as RespostaCategoria;
  return (r.query?.categorymembers ?? []).map((m) => m.title);
}
