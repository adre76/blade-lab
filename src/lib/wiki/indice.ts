/**
 * Lê "List of Beyblade X products (Takara Tomy)" — o índice oficial de
 * produtos da wiki — e responde, para um nome de produto, o que ele diz.
 *
 * Existe porque `BeybladeSchema` (src/lib/seed/schema.ts) exige
 * `release_type`, e nenhum infobox de página de bey traz esse campo — não há
 * onde tirá-lo ali. O índice, uma wikitable separada, é a única fonte
 * pública que carrega tipo de lançamento e data, e uma onda anterior deste
 * projeto já resolveu o mesmo problema lendo-o (ver ledger da Onda CX).
 *
 * Este módulo só PARSEIA e CONVERTE — nunca decide `rarity`. Medido contra o
 * catálogo já existente: `rarity` não é função de `release_type`
 * (`random_booster` se divide em uncommon/rare/very_rare por curadoria da
 * Onda 3, enquanto `starter` e `deck_set` são sempre `common`). Uma regra
 * aqui fabricaria um fato que não existe na fonte.
 */

/** Mesmo enum de `TipoLancamento` em src/lib/seed/schema.ts — duplicado de
 * propósito: importar o schema aqui criaria uma dependência de src/lib/wiki/
 * (parser de wikitext) para src/lib/seed/ (validação de banco), invertendo a
 * direção que o resto do projeto usa (wiki é fonte, seed é consumidor). */
export type TipoLancamento =
  | "starter" | "booster" | "random_booster" | "deck_set"
  | "custom_set" | "limited" | "event_exclusive" | "other";

/**
 * Uma linha do índice, já separada em campos — antes de qualquer conversão.
 *
 * `rotulo` vem vazio ("") quando a célula de tipo/nome não tem palavra antes
 * do link do produto — é o caso de sets ("Battle Entry Set C") e de reedições
 * sem rótulo (o bey aparece sozinho, ex.: "[[ValkyrieVolt S4-70V]] (Metal
 * Coat: Gold)"). Vazio, não um traço "—": o traço que a medição do brief
 * mostra é só a transcrição legível de quem mediu, a wiki real não escreve
 * nada ali (confirmado lendo o wikitext bruto da página).
 */
export type EntradaDoIndice = {
  codigo: string;
  rotulo: string;
  nome: string;
  dataCrua: string;
};

/**
 * Agrupa as linhas da wikitext em blocos, um por linha de tabela, cortando
 * em toda linha que comece com "|-" (separador de linha do MediaWiki).
 *
 * Iterar linha a linha (em vez de um `.split` por regex no delimitador
 * inteiro) tolera uma linha "|- style=...\n" com atributo depois do "-",
 * que um split ancorado em "\n|-\n" exato perderia.
 */
function blocosDaTabela(wikitext: string): string[][] {
  const blocos: string[][] = [];
  let atual: string[] = [];
  for (const linha of wikitext.split(/\r?\n/)) {
    if (linha.startsWith("|-")) {
      if (atual.length) blocos.push(atual);
      atual = [];
      continue;
    }
    atual.push(linha);
  }
  if (atual.length) blocos.push(atual);
  return blocos;
}

/**
 * Células de dado de um bloco: linhas que começam com "|" (célula), menos
 * "|}" (fecho da tabela). Cabeçalho usa "!" em vez de "|" e cai fora sozinho
 * — não precisa de um caso especial para ele.
 */
function celulasDoBloco(bloco: string[]): string[] {
  return bloco
    .filter((l) => l.startsWith("|") && !l.startsWith("|}"))
    .map((l) => l.slice(1).trim());
}

/**
 * Parseia a wikitext inteira do índice em entradas.
 *
 * Um bloco com menos de 3 células não é linha de produto — é a abertura da
 * tabela (`{| class="wikitable"`, que nem começa com "|" sozinho) ou o
 * cabeçalho (células "!", filtradas por `celulasDoBloco`), então sobra zero
 * célula e o bloco é ignorado sem precisar de um caso dedicado para "isto é
 * cabeçalho".
 */
export function analisarIndice(wikitext: string): EntradaDoIndice[] {
  const entradas: EntradaDoIndice[] = [];

  for (const bloco of blocosDaTabela(wikitext)) {
    const celulas = celulasDoBloco(bloco);
    if (celulas.length < 3) continue;

    const [codigo, celulaTipoNome, dataCrua] = celulas;

    // O nome do produto é o alvo do PRIMEIRO link — texto antes dele é o
    // rótulo ("Starter", "Booster", ou nada); texto depois (ex.: "(Metal
    // Coat: Gold)") é descartado, porque não faz parte do nome do produto.
    // Um link com pipe ("[[Alvo|Texto exibido]]") usa o alvo, não o texto
    // exibido — é a forma real da linha do Lock Chip - Perseus.
    const m = celulaTipoNome!.match(/^(.*?)\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
    if (!m) continue; // célula sem link de produto: não é uma linha de produto

    entradas.push({
      codigo: codigo!.trim(),
      rotulo: m[1]!.trim(),
      nome: m[2]!.trim(),
      dataCrua: dataCrua!.trim(),
    });
  }

  return entradas;
}

const MESES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * "March 29th, 2025" → "2025-03-29". "July 17th, 2025 ([[Rare Bey Get
 * Battle]])" → "2025-07-17" — a data é sempre a parte que ABRE a célula, e a
 * âncora "^" no início do regex já garante isso sem precisar remover o resto
 * da célula primeiro.
 *
 * `(?:st|nd|rd|th)?` aceita qualquer um dos quatro sufixos ordinais sem
 * validar se é o sufixo "certo" para aquele dia (ex.: não checa se "1st" só
 * vale para dias terminados em 1) — a wiki já escreve o sufixo certo, e
 * validar isso seria reimplementar uma regra que a fonte já segue.
 *
 * Devolve `null` para o que não reconhece, nunca uma data inventada —
 * `BeybladeSchema.release_date` (src/lib/seed/schema.ts) já trata `null`
 * como "sem confirmação", e o comentário de lá é explícito: "Data errada é
 * pior que ausente."
 */
export function converterData(dataCrua: string): string | null {
  const m = dataCrua.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/);
  if (!m) return null;

  const mes = MESES[m[1]!.toLowerCase()];
  if (!mes) return null;

  const dia = m[2]!.padStart(2, "0");
  const mesStr = String(mes).padStart(2, "0");
  return `${m[3]}-${mesStr}-${dia}`;
}

/** Devolvido por `tipoDaEntrada`: ou o tipo foi decidido, ou não — nunca um
 * `null`/`other` disfarçado de decisão. Ver comentário de `tipoDaEntrada`. */
export type ResultadoTipo =
  | { determinado: true; tipo: TipoLancamento }
  | { determinado: false };

/**
 * Decide `release_type` a partir do rótulo e do nome de UMA entrada já
 * parseada — nunca adivinha. Regras medidas contra o índice real:
 *
 *   rótulo "Starter" → starter
 *   rótulo "Booster" → booster
 *   sem rótulo, nome começa com "Random Booster" → random_booster
 *   sem rótulo, nome termina em "Deck Set" → deck_set
 *   qualquer outro caso → INDETERMINADO
 *
 * O último balde não vira `other`: "Battle Entry Set C" e "Start Dash Set C"
 * caem nele, e nenhum bey coletado carrega os códigos CX-04 ou CX-16 (essas
 * duas linhas do índice apontam para a página do SET, não de um bey) — mas
 * um nome de BEY sem rótulo (reedição ou evento promocional, ex.:
 * "ValkyrieVolt S4-70V" na linha CX-00 de 17/07/2025) cai no MESMO balde, e
 * aí a ausência É real: o índice não diz que tipo de produto aquilo foi.
 * `other` leria como um fato ("o índice determinou: é outro tipo"), quando o
 * fato é a ausência de determinação — daí o formato `{ determinado: false }`
 * em vez de `{ determinado: true, tipo: "other" }`, para o chamador nunca
 * confundir os dois.
 */
export function tipoDaEntrada(entrada: EntradaDoIndice): ResultadoTipo {
  if (entrada.rotulo === "Starter") return { determinado: true, tipo: "starter" };
  if (entrada.rotulo === "Booster") return { determinado: true, tipo: "booster" };
  if (entrada.rotulo === "" && entrada.nome.startsWith("Random Booster")) {
    return { determinado: true, tipo: "random_booster" };
  }
  if (entrada.rotulo === "" && entrada.nome.endsWith("Deck Set")) {
    return { determinado: true, tipo: "deck_set" };
  }
  return { determinado: false };
}

/** Remove todo espaço e normaliza caixa — a wiki às vezes escreve o nome do
 * produto sem o espaço que o bey tem (ex.: índice "HornetFortR7-60T", bey
 * "HornetFort R7-60T"); comparar só ignorando espaço, nos dois lados, casa
 * os dois sem risco de um nome comer o de outro produto (a wiki não tem dois
 * beys cujo nome só difira por espaço). */
function normalizarNome(nome: string): string {
  return nome.replace(/\s+/g, "").toLowerCase();
}

/** O que o índice diz sobre um produto: a entrada encontrada, se o tipo foi
 * determinado, e a data já convertida (ou `null`, nos mesmos termos de
 * `converterData`). */
export type ConsultaIndice = {
  entrada: EntradaDoIndice;
  tipo: ResultadoTipo;
  data: string | null;
};

/**
 * Procura um produto pelo nome entre as entradas já parseadas.
 *
 * `null` quando o nome não aparece em NENHUMA entrada — distinto de "achou,
 * mas o tipo é indeterminado" (`ConsultaIndice.tipo.determinado === false`),
 * que ainda assim pode trazer uma data válida (é o caso do ValkyrieVolt
 * S4-70V: achado, sem rótulo, `data` = "2025-07-17"). Confundir os dois
 * estados faria o chamador reportar "sem tipo" igual para um produto que o
 * índice nem conhece e para um que conhece mas não rotula — dois defeitos
 * diferentes que pedem correções diferentes.
 *
 * Quando o nome aparece MAIS DE UMA VEZ (reedição, evento promocional),
 * vence a PRIMEIRA ocorrência na ordem do documento. Medido no índice real:
 * DranBrave S6-60V, PegasusBlast ATr e WizardArc R4-55LO aparecem duas vezes
 * cada — uma como o produto original com código numerado (CX-01/07/02,
 * rótulo Starter) e de novo, meses ou anos depois, como reedição ou evento
 * (código CX-00, rótulo diferente ou nenhum). A tabela `beyblades` grava o
 * bey como saiu de fábrica (spec §4.4) — a reedição não é um produto novo, é
 * o mesmo bey vendido de novo, e a tabela é cronológica: a primeira
 * ocorrência é sempre o lançamento original.
 */
export function consultarIndice(
  entradas: readonly EntradaDoIndice[], nomeProduto: string,
): ConsultaIndice | null {
  const alvo = normalizarNome(nomeProduto);
  const achada = entradas.find((e) => normalizarNome(e.nome) === alvo);
  if (!achada) return null;

  return { entrada: achada, tipo: tipoDaEntrada(achada), data: converterData(achada.dataCrua) };
}
