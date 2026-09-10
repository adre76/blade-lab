/**
 * Coleta a Beyblade Wiki para dentro de `data/`.
 *
 * NÃO escreve no banco. Quem semeia é o `scripts/seed.ts`, e manter os dois
 * separados é o que permite recoletar quantas vezes for preciso sem risco.
 *
 * A lógica mora em `src/lib/wiki/`, com testes; aqui fica só a orquestração,
 * porque a suíte só enxerga `src/`.
 *
 * `--simular` roda a coleta inteira e imprime tudo — contagens, descartes e o
 * que entraria em cada arquivo — sem criar nem alterar nada em `data/`. Um
 * humano lê a lista de descartes ANTES de o dado entrar: todo defeito de
 * dado das ondas anteriores estava numa lista de descartes que ninguém leu.
 *
 * Uso:  npm run coletar -- --linha CX --simular   (só relatório, não grava)
 *       npm run coletar -- --linha CX             (grava de verdade)
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { buscarNaRede, membrosDaCategoria, paginas } from "../src/lib/wiki/api.ts";
import { pecaDaPagina, type PecaColetada } from "../src/lib/wiki/peca.ts";
import { beyDaPagina, conferirGiro, type BeyColetado } from "../src/lib/wiki/bey.ts";
import { carregarPartes } from "../src/lib/seed/carregar.ts";

const args = process.argv.slice(2);
const opcao = (nome: string) => {
  const i = args.indexOf("--" + nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const SIMULAR = args.includes("--simular");

const CATEGORIA: Record<string, string> = {
  BX: "Basic Line Beyblades",
  UX: "Unique Line Beyblades",
  CX: "Custom Line Beyblades",
};
const LISTA_DE_PECAS: Record<string, string> = {
  BX: "List of Basic Line parts",
  UX: "List of Unique Line parts",
  CX: "List of Custom Line parts",
};

const linha = opcao("linha");
if (!linha || !CATEGORIA[linha]) {
  console.error("uso: npm run coletar -- --linha CX [--simular]");
  process.exit(1);
}

const RAIZ = new URL("../data/", import.meta.url);
const descartes: string[] = [];

/** Rótulo de página para o relatório: canônico, com o pedido ao lado se divergir. */
const rotuloDaPagina = (tituloPedido: string, tituloCanonico: string) =>
  tituloCanonico === tituloPedido
    ? tituloCanonico
    : `${tituloCanonico} (pedido como "${tituloPedido}")`;

/**
 * Linha de descarte a partir de uma exceção capturada. `pecaDaPagina` e
 * `beyDaPagina` já prefixam a própria mensagem com o título canônico
 * (`"${titulo}: ..."`); repetir o rótulo na frente duplicaria o título. Só
 * antepõe o rótulo (com o "pedido como" quando a página veio de redirect)
 * para mensagens que ainda NÃO começam com o título canônico — como as que
 * este script lança sozinho (ex.: "peças não encontradas...").
 */
function linhaDeDescarte(
  tipo: "PEÇA" | "BEY", tituloPedido: string, tituloCanonico: string, erro: Error,
): string {
  const msg = erro.message;
  if (msg.startsWith(`${tituloCanonico}:`)) return `${tipo} ${msg}`;
  return `${tipo} ${rotuloDaPagina(tituloPedido, tituloCanonico)}: ${msg}`;
}

console.log(`\n=== coleta ${linha}${SIMULAR ? " — MODO SIMULAÇÃO, nada será gravado" : ""} ===\n`);

// ─── Peças ───────────────────────────────────────────────────────────────────
// Correção 1: `paginas` devolve Map<string, {titulo, texto}> — a chave é o
// título PEDIDO, `titulo` é o título CANÔNICO que a wiki serviu depois de
// redirects. É o canônico que vai para `pecaDaPagina` (e por tabela, para
// `source_url`): três páginas reais da Custom Line só são alcançadas por
// redirect, e citar o nome do redirect como fonte estaria errado.
const indice = await paginas([LISTA_DE_PECAS[linha]!], buscarNaRede);
const wikitextDaLista = [...indice.values()][0]?.texto ?? "";
const titulosDePeca = [...new Set(
  [...wikitextDaLista.matchAll(/\[\[(?!File:)([^\]|]+)\|/g)].map((m) => m[1]!.trim()),
)].filter((t) => / - /.test(t));

console.log(`lista de peças: ${titulosDePeca.length} títulos`);
const pgPecas = await paginas(titulosDePeca, buscarNaRede);
console.log(`páginas de peça respondidas: ${pgPecas.size}`);

const pecasColetadas: PecaColetada[] = [];
for (const [tituloPedido, pagina] of pgPecas) {
  try {
    pecasColetadas.push(pecaDaPagina(pagina.titulo, pagina.texto));
  } catch (e) {
    descartes.push(linhaDeDescarte("PEÇA", tituloPedido, pagina.titulo, e as Error));
  }
}

// Correção 4: peça de marca Hasbro sem correspondente Takara Tomy é
// descartada — a mesma decisão já tomada para as Ratchet-Integrated Blades
// (ver data/descartes.md). Por construção de `marcaDoCodigo`, toda peça que
// chega aqui com brand "hasbro" já não teve nome promovido por um AKA
// "(Takara Tomy)" nem rótulo "(Takara Tomy)" no ProductCode — ou seja, não
// tem correspondente conhecido. Não entra no catálogo (não é a marca dele) e
// não entra em `porNome` (não pode ser citada por um bey Takara Tomy).
const pecasValidas: PecaColetada[] = [];
for (const p of pecasColetadas) {
  if (p.brand === "hasbro") {
    descartes.push(
      `PEÇA ${p.name} (${p.source_url}): marca hasbro sem correspondente Takara Tomy — `
      + "descartada pela política já registrada em data/descartes.md para as "
      + "Ratchet-Integrated Blades exclusivas da Hasbro.",
    );
    continue;
  }
  pecasValidas.push(p);
}

// ─── Beys ────────────────────────────────────────────────────────────────────
const titulosDeBey = await membrosDaCategoria(CATEGORIA[linha]!, buscarNaRede);
console.log(`categoria de beys: ${titulosDeBey.length} títulos`);
const pgBeys = await paginas(titulosDeBey, buscarNaRede);
console.log(`páginas de bey respondidas: ${pgBeys.size}`);

// Correção 2: a existência de peça citada é conferida contra a UNIÃO da
// coleta desta linha com o catálogo que já está em data/ — não só contra o
// que foi coletado agora. Sem a união, um bey CX que cita uma catraca ou
// ponta Basic/Unique Line (ex.: "2-60", "Dot", "Flat") perderia a peça por
// ela nunca ter sido coletada NESTA rodada, mesmo já existindo no catálogo.
// Medido contra a wiki real: sem a união, 39 dos 40 beys Takara Tomy da CX
// seriam descartados; com ela, zero.
const partesExistentes = carregarPartes(RAIZ);
const porNome = new Map<string, { spin_direction?: "right" | "left" | "dual" | null }>();
for (const p of partesExistentes) porNome.set(`${p.slot}|${p.name}`, p);
for (const p of pecasValidas) porNome.set(`${p.slot}|${p.name}`, p);

const LAMINAS = ["blade", "integrated_blade", "main_blade", "metal_blade"];

const beysValidos: BeyColetado[] = [];
const beysHasbroDescartados: BeyColetado[] = [];

for (const [tituloPedido, pagina] of pgBeys) {
  try {
    // Correção 6: `beyDaPagina` estoura para classificação/sistema
    // desconhecidos, para ProductCode ausente (página de anime/mangá que
    // nunca foi produto) e para ProductCode que `marcaDoCodigo` não sabe
    // atribuir. Cada estouro vira um descarte, e a coleta continua — uma
    // página ruim não pode parar a rodada inteira.
    const b = beyDaPagina(pagina.titulo, pagina.texto);

    // Correção 3: o catálogo só tem beys Takara Tomy (a nota em
    // data/beyblades/ux.json já registra essa política). A categoria da CX
    // traz beys nomeados pela Hasbro junto dos Takara Tomy; filtrar por
    // marca aqui é aplicar a MESMA política já em vigor, não uma nova.
    if (b.brand === "hasbro") {
      beysHasbroDescartados.push(b);
      descartes.push(
        `BEY ${rotuloDaPagina(tituloPedido, pagina.titulo)}: marca hasbro — o catálogo só `
        + "tem beys Takara Tomy (ver nota em data/beyblades/ux.json).",
      );
      continue;
    }

    // Toda peça citada tem de existir na união coleta+catálogo (correção 2).
    const faltando = b.parts.filter((p) => !porNome.has(`${p.slot}|${p.name}`));
    if (faltando.length) {
      throw new Error(
        "peças não encontradas nem nesta coleta nem no catálogo já existente: "
        + faltando.map((p) => `${p.slot}=${p.name}`).join(", "),
      );
    }

    // Giro derivado das peças × giro declarado pelo bey.
    const lamina = b.parts.find((p) => LAMINAS.includes(p.slot));
    const giro = lamina ? porNome.get(`${lamina.slot}|${lamina.name}`)!.spin_direction ?? null : null;
    conferirGiro(b, giro);

    beysValidos.push(b);
  } catch (e) {
    descartes.push(linhaDeDescarte("BEY", tituloPedido, pagina.titulo, e as Error));
  }
}

// ─── Escrita (ou simulação dela) ─────────────────────────────────────────────
// Preserva o que já existe: o arquivo é reescrito com a UNIÃO do que estava
// nele e do que veio agora, casando por chave natural. `data/` é upsert-only
// (o seed nunca apaga), e a coleta segue a mesma regra. Em `--simular`, tudo
// isto roda até o fim — inclusive a leitura do arquivo atual — só a escrita
// em si (`writeFileSync`) não acontece.
function gravar(caminho: string, chave: string, novos: Record<string, unknown>[], nota: string) {
  const url = new URL(caminho, RAIZ);
  const antigo = existsSync(url)
    ? JSON.parse(readFileSync(url, "utf8")) as Record<string, unknown>
    : {};
  const existentes = (antigo[chave] ?? []) as Record<string, unknown>[];

  const id = (r: Record<string, unknown>) =>
    `${r["brand"] ?? "takara_tomy"}|${r["slot"] ?? r["release_code"]}|${r["name"]}`;

  const mapa = new Map(existentes.map((r) => [id(r), r]));
  const antes = mapa.size;
  for (const n of novos) mapa.set(id(n), n);
  const chavesNovas = mapa.size - antes;

  const acao = SIMULAR ? "SERIA gravado" : "gravado";
  console.log(
    `  ${caminho}: ${mapa.size} registros no total `
    + `(${antes} já existiam, ${chavesNovas} entrariam de novo, `
    + `${novos.length} vieram desta coleta) — ${acao}`,
  );

  if (!SIMULAR) {
    writeFileSync(url, JSON.stringify({
      _fonte: "https://beyblade.fandom.com/wiki/",
      _nota: nota,
      [chave]: [...mapa.values()],
    }, null, 2) + "\n");
  }
}

const NOTA = `Coletado por scripts/coletar.ts em ${new Date().toISOString().slice(0, 10)}. `
  + "Anatomia derivada dos campos de peça do infobox; marca pelo rótulo/formato do "
  + "ProductCode (ou pela promoção de um AKA rotulado Takara Tomy); só entram peças "
  + "e beys de marca takara_tomy.";

// `BeyColetado.parts` é uma lista ordenada (o infobox tem ordem visual); o
// formato do arquivo é um objeto slot → nome, como em data/beyblades/*.json.
// A reforma é só de formato — nenhum dado muda de valor.
const beysParaGravar = beysValidos.map(({ parts, ...resto }) => ({
  ...resto,
  parts: Object.fromEntries(parts.map((p) => [p.slot, p.name])),
}));

console.log(`\n${SIMULAR ? "seria gravado" : "gravando"}:`);
for (const slot of new Set(pecasValidas.map((p) => p.slot))) {
  gravar(
    `parts/${slot}s.json`, "parts",
    pecasValidas.filter((p) => p.slot === slot) as unknown as Record<string, unknown>[],
    NOTA,
  );
}
gravar(
  `beyblades/${linha.toLowerCase()}.json`, "beyblades",
  beysParaGravar as unknown as Record<string, unknown>[],
  NOTA,
);

// ─── Relatório ───────────────────────────────────────────────────────────────
console.log(`\n=== contagens ===`);
console.log(`peças processadas com sucesso: ${pecasColetadas.length}`);
console.log(`  das quais marca hasbro (descartadas): ${pecasColetadas.length - pecasValidas.length}`);
console.log(`peças válidas (takara_tomy) por slot:`);
for (const slot of new Set(pecasValidas.map((p) => p.slot))) {
  console.log(`  ${slot}: ${pecasValidas.filter((p) => p.slot === slot).length}`);
}

console.log(`\nbeys válidos (takara_tomy): ${beysValidos.length}`);
console.log(`  dos quais marca hasbro (descartados): ${beysHasbroDescartados.length}`);
console.log(`beys válidos por anatomia:`);
for (const anatomia of new Set(beysValidos.map((b) => b.anatomy))) {
  console.log(`  ${anatomia}: ${beysValidos.filter((b) => b.anatomy === anatomia).length}`);
}

console.log(`\ncoletados: ${pecasValidas.length} peças, ${beysValidos.length} beys`);
if (descartes.length) {
  console.log(`\n${descartes.length} DESCARTES — leia um por um:\n`);
  for (const d of descartes) console.log("  " + d);
} else {
  console.log("\n0 descartes.");
}
