/**
 * Baixa as imagens do catálogo da Beyblade Wiki e envia ao Supabase Storage.
 *
 * IDEMPOTENTE: pula o que já tem `image_path` no banco. Use --force para
 * reprocessar tudo.
 *
 * Por que baixar em vez de referenciar por hotlink:
 *   1. Não onerar servidor alheio a cada visita ao catálogo.
 *   2. Link externo quebra quando a outra ponta reorganiza os arquivos, e o
 *      catálogo passaria a exibir buracos sem ninguém perceber.
 *
 * As imagens são arte oficial da Takara Tomy/Hasbro, usadas sem fins
 * comerciais num catálogo de fãs. A página /creditos registra isso e o canal
 * para pedido de remoção.
 *
 * Uso:
 *   npm run seed:images            (só o que falta)
 *   npm run seed:images -- --force (tudo de novo)
 */
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !serviceKey) {
  console.error(
    [
      "Faltam credenciais de administração.",
      "",
      "  1. cp .env.seed.example .env.seed",
      "  2. preencha SUPABASE_SERVICE_ROLE_KEY com a chave 'secret' do painel",
      "  3. rode de novo",
    ].join("\n"),
  );
  process.exit(1);
}

const FORCE = process.argv.includes("--force");
const BUCKET = "bey-images";
const WIKI = "https://beyblade.fandom.com/api.php";

/** Pausa entre downloads. Raspar sem intervalo é abuso, e derruba o acesso para todos. */
const PAUSA_MS = 350;
const pausar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/**
 * Título da página na wiki.
 *
 * A Beyblade Wiki grafa o nome da lâmina SEM espaço ("DranSword 3-60F"),
 * enquanto o catálogo usa a forma legível ("Dran Sword 3-60F"). As páginas de
 * peça seguem o padrão "Blade - DranSword".
 */
function tituloBey(nome: string): string {
  const m = nome.match(/^(.+?)\s+(\S+)$/);
  if (!m) return nome;
  return m[1]!.replace(/\s+/g, "") + " " + m[2]!;
}

/**
 * Título exato da página, quando o registro guarda a URL de onde veio.
 *
 * Vale mais que qualquer reconstrução a partir do nome: as repinturas de
 * colaboração têm página com outro nome ("Ptera Swing 4-55D" mora em
 * "Quetzalcoatlus 4-55D"), e aí o palpite erra e a imagem some sem aviso.
 */
function tituloDaFonte(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^https:\/\/beyblade\.fandom\.com\/wiki\/(.+)$/);
  if (!m) return null;
  return decodeURIComponent(m[1]!).replace(/_/g, " ");
}

function tituloPeca(slot: string, nome: string): string {
  const prefixo: Record<string, string> = {
    blade: "Blade", ratchet: "Ratchet", bit: "Bit",
    main_blade: "Main Blade", assist_blade: "Assist Blade",
    lock_chip: "Lock Chip", metal_blade: "Metal Blade", over_blade: "Over Blade",
  };
  return `${prefixo[slot] ?? slot} - ${nome.replace(/\s+/g, "")}`;
}

/**
 * Nome do arquivo que a wiki marca como imagem de PRODUTO, lido do infobox.
 *
 * Não uso `prop=pageimages`: ele devolve a imagem que o MediaWiki elege como
 * principal da página, que não é a do infobox. Isso trouxe um quadro de mangá
 * para o HellsNether Z e vistas alternativas para outros — arte que não é o
 * produto, num catálogo de produtos.
 *
 * Duas formas no infobox, as duas com rótulo:
 *   |Image1=HellsNether Z.png
 *   |Image1Label=Product
 * e a galeria, quando a página tem mais de uma vista:
 *   |Image=<gallery>
 *   PteraSwing 7-70B (Side View).jpeg|Product
 *   Beyblade X - PteraSwing 7-70B.png|Anime
 *   </gallery>
 *
 * Quando nada estiver marcado como Product, fica o primeiro campo de imagem —
 * é o que a página mostra no topo.
 */
function arquivoDeProduto(wikitexto: string): string | null {
  const galeria = wikitexto.match(/<gallery>([\s\S]*?)<\/gallery>/i);
  if (galeria) {
    for (const linha of galeria[1]!.split("\n")) {
      const [arquivo, rotulo] = linha.split("|");
      if (arquivo?.trim() && /product/i.test(rotulo ?? "")) return arquivo.trim();
    }
  }
  const rotulado = wikitexto.match(/\|\s*Image(\d?)\s*=\s*([^\n|<]+)[\s\S]{0,80}?Image\1Label\s*=\s*Product/i);
  if (rotulado?.[2]?.trim()) return rotulado[2].trim();

  const primeiro = wikitexto.match(/\|\s*Image\d?\s*=\s*([^\n|<]+)/i);
  return primeiro?.[1]?.trim() || null;
}

/**
 * URL da imagem de produto de cada página, em lotes.
 *
 * `redirects=1` é obrigatório e não é detalhe: metade das lâminas tem página
 * sob o nome Hasbro, e a grafia Takara Tomy é só um redirect. `Blade -
 * PteraSwing` aponta para `Blade - Talon Ptera`, e sem seguir o redirect a
 * consulta caía na página de redirecionamento, que não tem imagem.
 *
 * São duas idas: a primeira lê o wikitexto para saber QUAL arquivo, a segunda
 * resolve o arquivo em URL. Continua em lotes de 50, então são 4 requisições
 * por 100 páginas em vez de 100.
 */
async function buscarImagens(titulos: string[]): Promise<Map<string, string>> {
  const arquivoPorTitulo = new Map<string, string>();

  for (let i = 0; i < titulos.length; i += 50) {
    const lote = titulos.slice(i, i + 50);
    const resp = await fetch(
      `${WIKI}?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1` +
        `&format=json&titles=` + encodeURIComponent(lote.join("|")),
    );
    const json = (await resp.json()) as {
      query?: {
        pages?: Record<string, {
          title?: string;
          revisions?: { slots?: { main?: { "*"?: string } } }[];
        }>;
        redirects?: { from: string; to: string }[];
      };
    };
    // Seguir o redirect muda o título devolvido; o mapa é reindexado de volta
    // para o título PEDIDO, porque quem chamou não sabe do redirect.
    const pedidoDe = new Map((json.query?.redirects ?? []).map((r) => [r.to, r.from]));
    for (const p of Object.values(json.query?.pages ?? {})) {
      const texto = p.revisions?.[0]?.slots?.main?.["*"];
      if (!p.title || !texto) continue;
      const arquivo = arquivoDeProduto(texto);
      if (!arquivo) continue;
      arquivoPorTitulo.set(p.title, arquivo);
      const pedido = pedidoDe.get(p.title);
      if (pedido) arquivoPorTitulo.set(pedido, arquivo);
    }
    await pausar(PAUSA_MS);
  }

  const arquivos = [...new Set(arquivoPorTitulo.values())];
  const urlPorArquivo = new Map<string, string>();
  for (let i = 0; i < arquivos.length; i += 50) {
    const lote = arquivos.slice(i, i + 50).map((a) => `File:${a}`);
    const resp = await fetch(
      `${WIKI}?action=query&prop=imageinfo&iiprop=url&format=json&titles=` +
        encodeURIComponent(lote.join("|")),
    );
    const json = (await resp.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: { url?: string }[] }> };
    };
    for (const p of Object.values(json.query?.pages ?? {})) {
      const url = p.imageinfo?.[0]?.url;
      if (p.title && url) urlPorArquivo.set(p.title.replace(/^File:/, ""), url);
    }
    await pausar(PAUSA_MS);
  }

  const encontradas = new Map<string, string>();
  for (const [titulo, arquivo] of arquivoPorTitulo) {
    const url = urlPorArquivo.get(arquivo);
    if (url) encontradas.set(titulo, url);
  }
  return encontradas;
}

/** Baixa, converte para WebP e envia. Devolve o caminho relativo no bucket. */
async function processar(urlImagem: string, destino: string): Promise<string | null> {
  const resp = await fetch(urlImagem, {
    headers: { "User-Agent": "blade-x-lab/1.0 (catalogo de fas; contato via github.com/adre76/blade-lab)" },
  });
  if (!resp.ok) {
    console.warn(`  download falhou (${resp.status}): ${destino}`);
    return null;
  }

  const original = Buffer.from(await resp.arrayBuffer());
  const webp = await sharp(original)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const { error } = await db.storage.from(BUCKET).upload(destino, webp, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) {
    console.warn(`  upload falhou: ${destino} — ${error.message}`);
    return null;
  }
  return destino;
}

/** Nome de arquivo seguro a partir de um nome de catálogo. */
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ─── Beyblades ───────────────────────────────────────────────────────────────
const { data: beys, error: errBeys } = await db
  .from("beyblades")
  .select("id, name, release_code, image_path, source_url")
  .order("release_code");
if (errBeys) throw errBeys;

const beysPendentes = (beys ?? []).filter((b) => FORCE || !b.image_path);
console.log(`beyblades: ${beysPendentes.length} pendente(s) de ${beys?.length ?? 0}`);

const tituloDoBey = (b: { name: string; source_url?: string | null }) =>
  tituloDaFonte(b.source_url) ?? tituloBey(b.name);

const mapaBeys = await buscarImagens(beysPendentes.map(tituloDoBey));

let okBeys = 0;
for (const bey of beysPendentes) {
  const fonte = mapaBeys.get(tituloDoBey(bey));
  if (!fonte) {
    console.warn(`  sem imagem na wiki: ${bey.release_code} ${bey.name}`);
    continue;
  }
  const destino = `beys/${slug(bey.release_code)}-${slug(bey.name)}.webp`;
  const caminho = await processar(fonte, destino);
  if (caminho) {
    const { error } = await db.from("beyblades")
      .update({ image_path: caminho, image_source_url: fonte } as never)
      .eq("id", bey.id);
    if (error) throw error;
    okBeys++;
  }
  await pausar(PAUSA_MS);
}

// ─── Peças ───────────────────────────────────────────────────────────────────
const { data: pecas, error: errPecas } = await db
  .from("parts")
  .select("id, slot, name, image_path, source_url")
  .order("slot");
if (errPecas) throw errPecas;

const pecasPendentes = (pecas ?? []).filter((p) => FORCE || !p.image_path);
console.log(`peças: ${pecasPendentes.length} pendente(s) de ${pecas?.length ?? 0}`);

const tituloDaPeca = (p: { slot: string; name: string; source_url?: string | null }) =>
  tituloDaFonte(p.source_url) ?? tituloPeca(p.slot, p.name);

const mapaPecas = await buscarImagens(pecasPendentes.map(tituloDaPeca));

let okPecas = 0;
for (const peca of pecasPendentes) {
  const fonte = mapaPecas.get(tituloDaPeca(peca));
  if (!fonte) continue; // silencioso: muita peça não tem página própria
  const destino = `parts/${peca.slot}-${slug(peca.name)}.webp`;
  const caminho = await processar(fonte, destino);
  if (caminho) {
    const { error } = await db.from("parts")
      .update({ image_path: caminho, image_source_url: fonte } as never)
      .eq("id", peca.id);
    if (error) throw error;
    okPecas++;
  }
  await pausar(PAUSA_MS);
}

console.log(`\nconcluído: ${okBeys} imagens de bey, ${okPecas} de peça`);
