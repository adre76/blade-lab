/**
 * Lê o infobox de uma página da wiki.
 *
 * A diferença entre campo AUSENTE e campo VAZIO é carregada de propósito: o
 * Lock Chip declara `AttackStat=` sem valor, e é isso que separa "esta peça
 * não pontua" de "este dado ainda não foi coletado" (spec §3).
 */

/**
 * Localiza o template de infobox (`{{Part Infobox`, `{{Beyblade Infobox`,
 * ...) e devolve os índices de início (o primeiro `{` do template) e fim
 * (logo após o `}}` que fecha ESSE template, contando profundidade de
 * chaves) — não o primeiro `}}` que aparecer, que pode pertencer a um
 * template aninhado como `{{Translation|en=...|ja=...}}`.
 *
 * A busca ancora no nome do template, não na posição 0: algumas páginas
 * trazem um hatnote (ex.: `{{About|...}}`) antes do infobox — caso real,
 * "Lightning L-Drago 1-60F (Upper Type)". Fatiar a partir de 0 só
 * funcionava por acidente, porque esses hatnotes são sempre de uma linha.
 */
function encontrarInfobox(wikitext: string): { inicio: number; fim: number } | null {
  const nome = wikitext.match(/\{\{\s*[A-Za-z][A-Za-z ]*Infobox\b/);
  if (!nome || nome.index === undefined) return null;
  const inicio = nome.index;

  let profundidade = 0;
  for (let i = inicio; i < wikitext.length; ) {
    if (wikitext.startsWith("{{", i)) {
      profundidade++;
      i += 2;
    } else if (wikitext.startsWith("}}", i)) {
      profundidade--;
      i += 2;
      if (profundidade === 0) return { inicio, fim: i };
    } else {
      i++;
    }
  }
  return null; // chaves nunca fecham: página malformada, tratamos como "sem infobox legível".
}

/** Só os campos de dentro do infobox, até o `}}` que efetivamente o fecha. */
export function lerInfobox(wikitext: string): Map<string, string> {
  const campos = new Map<string, string>();
  const alvo = encontrarInfobox(wikitext);
  // Nenhum template de infobox encontrado (ou chaves malformadas): mapa
  // vazio. `has()` devolve `false` para qualquer campo, o mesmo resultado
  // que "esta página não tem infobox" deve produzir para quem chama —
  // sem lançar exceção para um cenário real do corpus.
  if (!alvo) return campos;

  const corpo = wikitext.slice(alvo.inicio, alvo.fim);

  let profundidade = 0;
  let campoAtual: string | null = null;
  let valorAtual: string[] = [];

  const fechaCampo = () => {
    if (campoAtual !== null) campos.set(campoAtual, valorAtual.join("\n").trim());
    campoAtual = null;
    valorAtual = [];
  };

  for (const linha of corpo.split("\n")) {
    const profundidadeNaLinha = profundidade;
    for (let i = 0; i < linha.length; i++) {
      if (linha.startsWith("{{", i)) {
        profundidade++;
        i++;
      } else if (linha.startsWith("}}", i)) {
        profundidade--;
        i++;
      }
    }

    if (profundidadeNaLinha === 1) {
      // `^\|` ancora no começo da linha, na profundidade 1 (direto dentro
      // do infobox): um `|` no meio de {{Ruby|S|スラッシュ}} não abre campo
      // novo. Uma linha `|en=...` dentro de um template aninhado como
      // {{Translation|en=...}} começa com `|` mas está na profundidade 2+
      // — cai no ramo abaixo, como continuação do valor atual, e não vaza
      // como campo "en" do infobox.
      const m = linha.match(/^\|\s*([A-Za-z0-9_]+)\s*=(.*)$/);
      if (m) {
        fechaCampo();
        campoAtual = m[1]!;
        valorAtual.push(m[2]!);
        continue;
      }
    }
    if (campoAtual !== null && profundidadeNaLinha > 1) {
      valorAtual.push(linha);
    }
  }
  fechaCampo();
  return campos;
}

/** O primeiro item de um campo com várias linhas separadas por `<br>`. */
export function primeiroValor(bruto: string): string {
  return bruto.split(/<br\s*\/?>/i)[0]!.trim();
}

/**
 * Peças com dois conjuntos de atributos publicam `30 > 55` ou `20/50` — modos
 * de montagem ou de Xtreme Dash. O catálogo grava o PRIMEIRO e explica os dois
 * em `notes`, seguindo o precedente do Hells Nether (UX-21).
 */
export function temDoisModos(bruto: string): boolean {
  // Assume que todo `/` ou `>` num stat é separador de par de números (ex.:
  // "N/A" seria um falso positivo). Medido no corpus: nas 98 páginas de
  // peça da Custom Line, os 8 valores com `/` ou `>` são todos pares
  // genuínos, nos dois Ratchet-Integrated Bits — zero falsos positivos.
  return /[>/]/.test(bruto);
}

/** O número do stat, ou nulo se o campo estiver vazio — vazio não é zero. */
export function statNumerico(bruto: string): number | null {
  const m = bruto.trim().match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function gramas(bruto: string): number | null {
  const m = primeiroValor(bruto).match(/(\d+(\.\d+)?)\s*grams?/i);
  return m ? Number(m[1]) : null;
}

/**
 * Vocabulário do infobox → vocabulário do catálogo.
 *
 * Moram aqui, e não em `peca.ts` e `bey.ts`, porque os dois leem os MESMOS
 * campos: uma página de peça e uma de bey declaram `System`, `SpinDirection` e
 * `Type` do mesmo jeito. Duplicar convidaria os dois a divergirem no dia em
 * que a wiki acrescentasse um valor.
 */
export const LINHA_POR_SISTEMA: Record<string, "BX" | "UX" | "CX"> = {
  "Basic Line": "BX",
  "Unique Line": "UX",
  "Custom Line": "CX",
};

export const GIRO: Record<string, "right" | "left" | "dual"> = {
  "Right-Spin": "right",
  "Left-Spin": "left",
  "Dual-Spin": "dual",
};

export const TIPO: Record<string, "attack" | "defense" | "stamina" | "balance"> = {
  Attack: "attack", Defense: "defense", Stamina: "stamina", Balance: "balance",
};

/**
 * Marca a partir do `ProductCode` — mora aqui, e não só em `peca.ts`, porque
 * `bey.ts` (Task 6) lê o MESMO campo com a MESMA ambiguidade. Duplicar a regra
 * lá convidaria as duas a divergirem no dia em que a wiki mudasse o formato.
 *
 * `nomeVeioDeAkaTakaraTomy` decide PRIMEIRO, antes de qualquer rótulo do
 * `ProductCode`. Adotar um AKA rotulado "(Takara Tomy)" como o `name` do
 * registro (`peca.ts`) já é uma afirmação de que a peça existe na linha
 * Takara Tomy — sinal mais forte do que o rótulo de um código de produto.
 * A página real que forçou esta ordem ("Lock Chip - Stag") prova o porquê:
 * o próprio ProductCode se contradiz, escrevendo "G1684 (Hasbro)<br>CX-00
 * (Hasbro)" — um código CX, formato Custom Line da Takara Tomy, rotulado
 * Hasbro por erro de digitação da wiki. Enquanto isso, a seção de produtos
 * da MESMA página é inequívoca e está ativa: "===Takara Tomy=== * CX-00
 * [[BucksAntlers B2-60D]]". Confiar no rótulo do código, nesse caso, é
 * confiar no erro de digitação; confiar na promoção do AKA é confiar na
 * seção de produtos. Página de bey não promove nome a partir de AKA — quem
 * chama (`bey.ts`) passa sempre `false`.
 *
 * Depois da promoção, a ordem de sempre continua intacta: rótulo explícito
 * no código — "(Takara Tomy)" ou "(Hasbro)" — manda; sem rótulo, decide o
 * FORMATO do código (`BX-`/`UX-`/`CX-` seguido de dígitos é Takara Tomy,
 * `G` seguido de dígitos é Hasbro); nem rótulo nem formato reconhecível:
 * lança, nomeando a página e o código, em vez de adivinhar.
 *
 * Medido nas 103 peças reais da Custom Line, o rótulo/formato resolve
 * todas — nenhuma cai no `throw`. A leitura antiga ("sem rótulo Takara
 * Tomy = hasbro") classificava errado 22 dessas 103: todo código `CX-NN`
 * sem rótulo, que é exatamente o formato Takara Tomy sem rótulo.
 */
export function marcaDoCodigo(
  titulo: string,
  codigo: string,
  nomeVeioDeAkaTakaraTomy: boolean,
): "takara_tomy" | "hasbro" {
  if (nomeVeioDeAkaTakaraTomy) return "takara_tomy";
  if (/\(Takara Tomy\)/.test(codigo)) return "takara_tomy";
  if (/\(Hasbro\)/.test(codigo)) return "hasbro";
  if (/\b(?:BX|UX|CX)-\d/.test(codigo)) return "takara_tomy";
  if (/\bG\d/.test(codigo)) return "hasbro";
  throw new Error(
    `${titulo}: não dá para determinar a marca a partir de ProductCode "${codigo}"`,
  );
}

/** Resultado de {@link nomeEAkaDoInfobox}: nome canônico, alternâncias e se a promoção aconteceu. */
export type NomeEAka = {
  name: string;
  aka: string[] | null;
  nomeVeioDeAkaTakaraTomy: boolean;
};

/**
 * Resolve o nome canônico e as alternâncias (`aka`) a partir do campo `AKA`
 * do infobox — mora aqui, e não só em `peca.ts`, pela mesma razão de
 * `marcaDoCodigo` logo acima: `bey.ts` lê o MESMO campo com a MESMA
 * ambiguidade de rótulo/nome canônico. A página real "Fort Hornet R 7-60T"
 * (um bey) prova o porquê: a wiki publica a página sob o nome Hasbro, e o
 * nome Takara Tomy ("HornetFort R7-60T") só existe dentro do AKA — o mesmo
 * padrão do precedente "Stag"/"Bucks" que já existia em peça, agora do lado
 * do bey. Não é hipotético: numa onda anterior essa mesma confusão inverteu
 * o nome de três lâminas, porque o código confiava no título da página em
 * vez de ler o rótulo de marca do campo.
 *
 * O rótulo aceita as duas grafias que a wiki usa para "Takara Tomy" e para
 * "Hasbro": sem colchetes ("(Takara Tomy)", como as páginas de peça
 * escrevem) e com colchetes de wikilink ("([[Takara Tomy]])", como a
 * própria "Fort Hornet R 7-60T" escreve). Os colchetes são removidos ANTES
 * do match, então as duas grafias caem no mesmo `if`.
 *
 * - Entrada rotulada "(Takara Tomy)": promove a canônico; o nome que estava
 *   valendo até então (o parâmetro `nomeBase`, ou uma promoção anterior)
 *   desce para `aka`.
 * - Entrada rotulada "(Hasbro)": vira só uma entrada de `aka`; o nome não
 *   muda.
 * - Entrada sem rótulo (siglas como "GR"/"GU"/"LO"/"Nr"/"TK", romanizações
 *   como "Five Fifty"): descartada — não é nome de peça nem de bey nenhum.
 */
export function nomeEAkaDoInfobox(nomeBase: string, akaBruto: string): NomeEAka {
  let name = nomeBase;
  const aka: string[] = [];
  let nomeVeioDeAkaTakaraTomy = false;
  for (const entradaBruta of akaBruto.split(/<br\s*\/?>/i)) {
    const entrada = entradaBruta.replace(/\[\[|\]\]/g, "").trim();
    if (!entrada) continue;
    const hasbro = entrada.match(/^(.+?)\s*\(Hasbro\)\s*$/);
    if (hasbro) {
      aka.push(hasbro[1]!.trim());
      continue;
    }
    const takaraTomy = entrada.match(/^(.+?)\s*\(Takara Tomy\)\s*$/);
    if (takaraTomy) {
      aka.push(name);
      name = takaraTomy[1]!.trim();
      nomeVeioDeAkaTakaraTomy = true;
    }
  }
  return { name, aka: aka.length ? aka : null, nomeVeioDeAkaTakaraTomy };
}
