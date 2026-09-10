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
 * Anda a cadeia de redirects para frente, do título PEDIDO até o título final
 * que a wiki realmente serve.
 *
 * `redirects=1` resolve a cadeia inteira num pedido só, mas devolve um hop por
 * salto — para A→B→C a resposta traz [{A,B},{B,C}] e a página vem indexada em
 * "C". Um LOOKUP único acharia só o primeiro hop ("B"), um título intermediário
 * que ninguém pediu, e o pedido de "A" ficaria sem conteúdo. Por isso isto é um
 * LOOP, não um lookup.
 *
 * Mais importante que a cadeia longa: nas tabelas de peças da wiki, o nome
 * Hasbro e o nome Takara Tomy aparecem cada um em uma coluna, e um dos dois é
 * sempre redirect para o outro — os dois acabam pedidos na mesma leva. Andar
 * a cadeia a partir do título PEDIDO (em vez de indexar pela página devolvida
 * e tentar voltar) resolve com uma estrutura só os três formatos que isso
 * produz: o destino também foi pedido, duas origens caindo no mesmo destino
 * (fan-in), e uma cadeia de vários saltos — sem que um colida com o outro.
 *
 * `adiante` mapeia origem → destino de cada hop. `adiante.size` é o teto
 * seguro de passos: uma cadeia real não tem mais saltos do que hops existem
 * na resposta, e o mesmo teto impede um ciclo (A→B→A, que não devia existir
 * na wiki, mas se existir) de girar para sempre — sem precisar de um `Set` de
 * visitados.
 */
function destinoFinal(tituloPedido: string, adiante: Map<string, string>): string {
  let atual = tituloPedido;
  for (let passo = 0; passo < adiante.size; passo++) {
    const proximo = adiante.get(atual);
    if (proximo === undefined) break;
    atual = proximo;
  }
  return atual;
}

/** Página final resolvida para um título pedido. */
export type Pagina = { titulo: string; texto: string };

/**
 * Página final de cada título, indexada pelo título **pedido**.
 *
 * A resolução não é detalhe: nas tabelas de peças da wiki, o nome Hasbro e o
 * nome Takara Tomy aparecem cada um em uma coluna, e um dos dois é redirect
 * para o outro — os dois acabam pedidos juntos na mesma leva. Resolver cada
 * título pedido para frente (em vez de indexar pela página que a API devolveu
 * e tentar voltar) garante que TODO título pedido — origem, destino, ou
 * qualquer um dos dois lados de um fan-in — recebe uma entrada própria, com
 * `titulo` apontando para a página canônica que a wiki realmente serve. Esse
 * título canônico importa: é a partir dele que o `source_url` gravado no
 * banco é montado, e citar o nome errado faria a peça exibir a fonte errada
 * para quem usa o app.
 */
export async function paginas(titulos: string[], buscar: Busca): Promise<Map<string, Pagina>> {
  const saida = new Map<string, Pagina>();

  for (let i = 0; i < titulos.length; i += LOTE) {
    const fatia = titulos.slice(i, i + LOTE);
    const url = `${BASE}?format=json&action=query&prop=revisions`
      + `&rvprop=content&rvslots=main&redirects=1`
      + `&titles=${fatia.map(encodeURIComponent).join("|")}`;

    const r = (await buscar(url)) as RespostaPaginas;

    const adiante = new Map<string, string>();
    for (const { from, to } of r.query?.redirects ?? []) adiante.set(from, to);

    const porTitulo = new Map<string, string>();
    for (const p of Object.values(r.query?.pages ?? {})) {
      const texto = p.revisions?.[0]?.slots?.main?.["*"];
      // Página existente com wikitext vazio ("") cai no mesmo `continue` que
      // página inexistente — deliberado: não há conteúdo pra coletar nos dois
      // casos, e distinguir os dois exigiria um terceiro estado que nada aqui
      // consome.
      if (p.missing !== undefined || !texto) continue;
      porTitulo.set(p.title, texto);
    }

    for (const tituloPedido of fatia) {
      const titulo = destinoFinal(tituloPedido, adiante);
      const texto = porTitulo.get(titulo);
      if (texto !== undefined) saida.set(tituloPedido, { titulo, texto });
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
