/**
 * Lê o infobox de uma página da wiki.
 *
 * A diferença entre campo AUSENTE e campo VAZIO é carregada de propósito: o
 * Lock Chip declara `AttackStat=` sem valor, e é isso que separa "esta peça
 * não pontua" de "este dado ainda não foi coletado" (spec §3).
 */

/** Só as linhas do começo do arquivo, até o `}}` que fecha o infobox. */
export function lerInfobox(wikitext: string): Map<string, string> {
  const campos = new Map<string, string>();
  const fim = wikitext.indexOf("\n}}");
  const corpo = wikitext.slice(0, fim < 0 ? wikitext.length : fim);

  for (const linha of corpo.split("\n")) {
    // `^\|` ancora no começo da linha: um `|` no meio de {{Ruby|S|スラッシュ}}
    // não abre campo novo.
    const m = linha.match(/^\|\s*([A-Za-z0-9_]+)\s*=(.*)$/);
    if (m) campos.set(m[1]!, m[2]!.trim());
  }
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
