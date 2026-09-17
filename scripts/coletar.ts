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
import {
  analisarIndice, consultarIndice, converterData, entradasDeConjunto, itensDoConjunto, mesmoNome,
} from "../src/lib/wiki/indice.ts";
import { carregarPartes } from "../src/lib/seed/carregar.ts";
import {
  CAMPOS_DA_PECA, CAMPOS_DO_BEY, chaveDeBey, chaveDePeca, fundirRegistros,
} from "../src/lib/seed/merge.ts";
import { raridadePadraoDoTipo } from "../src/lib/seed/raridade.ts";

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

// Página única, não uma por linha: o índice oficial de produtos cobre BX, UX
// e CX na mesma wikitable (confirmado lendo a página inteira — linhas BX-00,
// UX-00 e CX-nn convivem lado a lado). `release_type`/`release_date` não têm
// outra fonte pública — nenhum infobox de bey carrega esses campos.
const TITULO_INDICE = "List of Beyblade X products (Takara Tomy)";

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
const pgListaDePecas = await paginas([LISTA_DE_PECAS[linha]!], buscarNaRede);
const wikitextDaLista = [...pgListaDePecas.values()][0]?.texto ?? "";
const titulosDePeca = [...new Set(
  [...wikitextDaLista.matchAll(/\[\[(?!File:)([^\]|]+)\|/g)].map((m) => m[1]!.trim()),
)].filter((t) => / - /.test(t));

console.log(`lista de peças: ${titulosDePeca.length} títulos`);
const pgPecas = await paginas(titulosDePeca, buscarNaRede);
console.log(`páginas de peça respondidas: ${pgPecas.size}`);

// ─── Índice oficial de produtos (release_type / release_date) ────────────────
// Mais uma chamada `paginas`, sobre o cliente já existente — o índice é só
// mais uma página da wiki, sem endpoint próprio.
const pgIndiceDeProdutos = await paginas([TITULO_INDICE], buscarNaRede);
const wikitextDoIndice = pgIndiceDeProdutos.get(TITULO_INDICE)?.texto ?? "";
const entradasDoIndice = analisarIndice(wikitextDoIndice);
console.log(`índice oficial de produtos: ${entradasDoIndice.length} entradas`);

// ─── Conjuntos (Random Booster / Deck Set): o índice nomeia o SET, não o bey ─
// Uma linha do índice do tipo random_booster ou deck_set não nomeia um bey —
// nomeia o VOLUME ou o SET ("Random Booster Vol. 6", "Evangelion Deck Set").
// Esses produtos têm página própria, que lista os beys de dentro (seção
// ==Assortment== ou ==Contents==) — é lá, não na linha do índice, que mora o
// nome do bey. `entradasDeConjunto` (src/lib/wiki/indice.ts) diz QUAIS linhas
// são essas e QUAL título buscar; a busca em si é responsabilidade deste
// script (o módulo não faz rede, por design — ver seu comentário de topo).
const entradasConjunto = entradasDeConjunto(entradasDoIndice);
const titulosDeConjunto = [...new Set(entradasConjunto.map((c) => c.entrada.nome))];
const pgConjuntos = await paginas(titulosDeConjunto, buscarNaRede);
console.log(
  `conjuntos do índice (random booster / deck set): ${entradasConjunto.length} linhas, `
  + `${titulosDeConjunto.length} páginas distintas, ${pgConjuntos.size} respondidas`,
);

// Cada conjunto resolvido carrega o tipo e a data JÁ da linha do índice (o
// conjunto todo sai junto, na mesma data) mais a lista de itens da própria
// página do produto — bey e não-bey misturados (ver comentário de
// `itensDoConjunto`). Uma página que não respondeu (título mudou, rede
// falhou) cai com `itens: []`, sem derrubar a coleta inteira: o bey que
// dependia dela simplesmente fica sem tipo, visível no relatório de
// "SEM tipo" mais abaixo — o mesmo tratamento que qualquer outra ausência.
const conjuntosResolvidos = entradasConjunto.map((c) => ({
  tipo: c.tipo,
  data: converterData(c.entrada.dataCrua),
  itens: itensDoConjunto(pgConjuntos.get(c.entrada.nome)?.texto ?? ""),
}));

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
// Preserva o que já existe: o arquivo é reescrito com a fusão do que estava
// nele e do que veio agora, casando por chave natural. A regra de fusão —
// qual campo o coletor tem autoridade para sobrescrever, qual é curadoria
// intocável — mora em src/lib/seed/merge.ts, testada, porque `data/` é
// upsert-only (o seed nunca apaga) e um registro fresco NÃO PODE substituir o
// existente por inteiro: isso apagaria em silêncio `release_type`, `rarity`,
// `rarity_reason` e qualquer outro campo curado à mão. Em `--simular`, tudo
// isto roda até o fim — inclusive a leitura do arquivo atual — só a escrita
// em si (`writeFileSync`) não acontece.
function gravar(
  caminho: string, chave: "parts" | "beyblades", novos: Record<string, unknown>[], nota: string,
) {
  const url = new URL(caminho, RAIZ);
  const antigo = existsSync(url)
    ? JSON.parse(readFileSync(url, "utf8")) as Record<string, unknown>
    : {};
  const existentes = (antigo[chave] ?? []) as Record<string, unknown>[];

  const chaveDe = chave === "parts" ? chaveDePeca : chaveDeBey;
  const campos = chave === "parts" ? CAMPOS_DA_PECA : CAMPOS_DO_BEY;

  const antes = existentes.length;
  const fundidos = fundirRegistros(
    existentes, novos, chaveDe as (r: Record<string, unknown>) => string, campos,
  );
  const chavesNovas = fundidos.length - antes;

  const acao = SIMULAR ? "SERIA gravado" : "gravado";
  console.log(
    `  ${caminho}: ${fundidos.length} registros no total `
    + `(${antes} já existiam, ${chavesNovas} entrariam de novo, `
    + `${novos.length} vieram desta coleta) — ${acao}`,
  );

  if (!SIMULAR) {
    writeFileSync(url, JSON.stringify({
      _fonte: "https://beyblade.fandom.com/wiki/",
      _nota: nota,
      [chave]: fundidos,
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
//
// `release_type`/`release_date` NÃO entram em `CAMPOS_DO_BEY` (merge.ts) —
// de propósito. Eles só são gravados aqui porque não há registro existente
// ainda (primeira coleta desta linha); numa recoleta futura, com o arquivo já
// existindo, `fundirRegistro` ignora esses dois campos do lado fresco e
// preserva o que já está gravado, curado ou não — a mesma proteção que já
// existe para `rarity`/`rarity_reason`. Sem isso, uma correção manual feita
// à mão no CX-00 ValkyrieVolt (por exemplo) seria apagada na próxima coleta.
//
// Dois caminhos até o tipo, nesta ordem: primeiro `consultarIndice` pelo
// nome do PRÓPRIO bey (starter/booster nomeados e reedições/eventos sob
// CX-00, ex.: LeonFang, HornetFort). Quando isso não determina nada — nome
// ausente do índice, ou achado sem rótulo (ValkyrieVolt) —, tenta o segundo
// caminho: o bey pode estar DENTRO de um conjunto (random booster/deck set)
// já resolvido em `conjuntosResolvidos`, casado por `mesmoNome` (mesma
// tolerância de espaço/caixa usada em `consultarIndice`). Um bey achado por
// nome próprio não é procurado nos conjuntos — não há caso real de um bey
// aparecer nos dois ao mesmo tempo, mas a ordem definida aqui é a que
// venceria se algum dia aparecesse.
const beysParaGravar = beysValidos.map(({ parts, ...resto }) => {
  const consulta = consultarIndice(entradasDoIndice, resto.name);
  let releaseType = consulta?.tipo.determinado ? consulta.tipo.tipo : null;
  let releaseDate = consulta?.data ?? null;

  if (releaseType === null) {
    // Pega o PRIMEIRO conjunto (na ordem de `conjuntosResolvidos`, que segue
    // a ordem do documento do índice) cujos itens citam este bey pelo nome —
    // sem checar se algum conjunto POSTERIOR também o cita. Mesmo risco já
    // documentado para "primeiro casamento vence" em `consultarIndice`
    // (`src/lib/wiki/indice.ts`): se um dia um bey aparecesse legitimamente
    // em dois conjuntos (ex.: reeditado num segundo Random Booster), esta
    // busca atribuiria a ele o tipo/data do conjunto ERRADO — o que aparece
    // primeiro no índice, não necessariamente o que o chamador queria — em
    // silêncio, sem erro algum. Não observado nos 40 beys da CX; sem guarda
    // por não haver caso real a proteger ainda.
    const doConjunto = conjuntosResolvidos.find(
      (c) => c.itens.some((item) => mesmoNome(item, resto.name)),
    );
    if (doConjunto) {
      releaseType = doConjunto.tipo;
      releaseDate = doConjunto.data;
    }
  }

  // `rarity`/`rarity_reason` são obrigatórios em `BeybladeSchema`, mas nenhum
  // módulo de coleta os produz — só o `release_type`, quando determinado,
  // sugere um padrão (spec §4.4, `raridadePadraoDoTipo`). Sem tipo
  // determinado, não há de onde derivar: os dois ficam `null`, junto com
  // `release_type`, para o mesmo humano curar os três campos juntos antes do
  // seed. Como `rarity`/`rarity_reason` também estão FORA de `CAMPOS_DO_BEY`
  // (mesma razão do comentário acima sobre `release_type`), este default só
  // vale para a primeira coleta — uma correção manual depois (ex.: a divisão
  // de random_booster em uncommon/rare/very_rare por caixa, já usada em
  // BX/UX) nunca é apagada por uma recoleta futura.
  const { rarity, rarity_reason } = releaseType === null
    ? { rarity: null, rarity_reason: null }
    : raridadePadraoDoTipo(releaseType);

  return {
    ...resto,
    release_type: releaseType,
    release_date: releaseDate,
    rarity,
    rarity_reason,
    parts: Object.fromEntries(parts.map((p) => [p.slot, p.name])),
  };
});

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

// `release_type` nulo não é erro de coleta — é o índice genuinamente não
// determinando o tipo (set/combo sem rótulo) ou o produto não aparecendo lá
// (reedição sob CX-00 sem nome batendo, random booster/deck set individual
// cujo nome não é o da linha do índice). NENHUM dos dois casos pode ficar
// escondido: sem esta lista, um bey sem `release_type` só seria descoberto
// quando `scripts/seed.ts` reprovasse o arquivo inteiro no Zod, muito depois
// de a coleta já ter terminado — tarde demais para o humano que precisa
// curar decidir com o contexto da coleta ainda fresco.
const beysComTipo = beysParaGravar.filter((b) => b.release_type !== null);
const beysSemTipo = beysParaGravar.filter((b) => b.release_type === null);
console.log(
  `\nrelease_type pelo índice oficial: ${beysComTipo.length} de ${beysParaGravar.length} `
  + `beys — ${beysSemTipo.length} SEM tipo, para curadoria humana:`,
);
for (const b of beysSemTipo) {
  console.log(`  ${b.name} (${b.release_code})`);
}

console.log(`\ncoletados: ${pecasValidas.length} peças, ${beysValidos.length} beys`);
if (descartes.length) {
  console.log(`\n${descartes.length} DESCARTES — leia um por um:\n`);
  for (const d of descartes) console.log("  " + d);
} else {
  console.log("\n0 descartes.");
}
