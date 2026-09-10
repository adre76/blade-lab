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
