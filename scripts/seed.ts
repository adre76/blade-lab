/**
 * Importa data/ para o Supabase.
 *
 * IDEMPOTENTE: reexecutar não duplica nem apaga. Faz upsert por chave natural —
 * (brand, slot, name) para peças, (brand, release_code, name) para beys.
 *
 * EXCEÇÃO: `anatomy_slots` é sincronizada destrutivamente por
 * scripts/sync-anatomies.ts (spec §4.3). Este script não a toca.
 *
 * Uso (a service_role key vem do ambiente, NUNCA de arquivo versionado):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { carregarPartes, carregarBeyblades } from "../src/lib/seed/carregar.ts";

const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !serviceKey) {
  console.error(
    [
      "Faltam credenciais de administração.",
      "",
      "  1. cp .env.seed.example .env.seed",
      "  2. preencha SUPABASE_SERVICE_ROLE_KEY com a chave 'secret' do painel",
      "     (Supabase > Project Settings > API Keys)",
      "  3. rode de novo",
      "",
      "O .env.seed é ignorado pelo git. NÃO cole essa chave em chat nem em",
      "arquivo versionado: ela ignora todo o RLS.",
    ].join("\n"),
  );
  process.exit(1);
}

const RAIZ = new URL("../data/", import.meta.url);
const chavePeca = (brand: string, slot: string, name: string) => `${brand}|${slot}|${name}`;
const chaveBey = (brand: string, code: string, name: string) => `${brand}|${code}|${name}`;

// ─── Validação antes de qualquer escrita ─────────────────────────────────────
// carregarPartes/carregarBeyblades lançam com a mensagem do Zod. Falhar aqui é
// barato; falhar no meio da escrita deixa o banco pela metade.
const partes = carregarPartes(RAIZ);
const beys = carregarBeyblades(RAIZ);
console.log(`validados: ${partes.length} peças, ${beys.length} beys`);

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// ─── Peças ───────────────────────────────────────────────────────────────────
// equivalent_name e image_source_url existem só nos arquivos: o primeiro vira
// equivalent_id no fim deste script, o segundo é consumido por seed-images.
const { error: errPartes } = await db.from("parts").upsert(
  partes.map(({ equivalent_name: _en, image_source_url: _is, ...p }) => p),
  { onConflict: "brand,slot,name" },
);
if (errPartes) throw errPartes;

// ─── Beyblades ───────────────────────────────────────────────────────────────
const { error: errBeys } = await db.from("beyblades").upsert(
  beys.map(({ parts: _p, equivalent_code: _ec, image_source_url: _is, ...b }) => b),
  { onConflict: "brand,release_code,name" },
);
if (errBeys) throw errBeys;

// ─── Ligações bey <-> peça ───────────────────────────────────────────────────
// Resolvidas por nome, depois que os dois lados existem no banco.
const { data: idsPartes, error: e1 } = await db
  .from("parts").select("id, brand, slot, name");
if (e1) throw e1;
const { data: idsBeys, error: e2 } = await db
  .from("beyblades").select("id, brand, release_code, name");
if (e2) throw e2;

const mapaPecas = new Map(
  (idsPartes ?? []).map((p) => [chavePeca(p.brand, p.slot, p.name), p.id]),
);
const mapaBeys = new Map(
  (idsBeys ?? []).map((b) => [chaveBey(b.brand, b.release_code, b.name), b.id]),
);

const ligacoes: { beyblade_id: string; part_id: string; slot: string }[] = [];
const orfas: string[] = [];

for (const b of beys) {
  const beyId = mapaBeys.get(chaveBey(b.brand, b.release_code, b.name));
  if (!beyId) {
    orfas.push(`bey não encontrado após upsert: ${b.release_code} ${b.name}`);
    continue;
  }
  for (const [slot, nomePeca] of Object.entries(b.parts)) {
    const partId = mapaPecas.get(chavePeca(b.brand, slot, nomePeca!));
    if (!partId) {
      orfas.push(`${b.release_code}: peça '${nomePeca}' (${slot}) não existe em data/parts`);
      continue;
    }
    ligacoes.push({ beyblade_id: beyId, part_id: partId, slot });
  }
}

// Aborta antes de gravar ligação pela metade. O teste de integridade já
// deveria ter pego isso — chegar aqui significa divergência entre arquivo e
// banco, o que merece parar e investigar.
if (orfas.length > 0) {
  console.error(`${orfas.length} referência(s) órfã(s):\n  ` + orfas.join("\n  "));
  process.exit(1);
}

const { error: errLig } = await db
  .from("beyblade_parts")
  .upsert(ligacoes, { onConflict: "beyblade_id,slot" });
if (errLig) throw errLig;

// ─── Equivalências Hasbro -> Takara Tomy (onda 6) ────────────────────────────
// Roda por último, quando todos os registros já existem. Sem efeito enquanto
// não houver dados Hasbro.
let equivalencias = 0;
for (const p of partes.filter((x) => x.equivalent_name)) {
  const alvo = mapaPecas.get(chavePeca("takara_tomy", p.slot, p.equivalent_name!));
  if (!alvo) {
    console.warn(`equivalente takara_tomy não encontrado para '${p.name}' (${p.slot})`);
    continue;
  }
  const { error } = await db.from("parts").update({ equivalent_id: alvo })
    .match({ brand: p.brand, slot: p.slot, name: p.name });
  if (error) throw error;
  equivalencias++;
}

for (const b of beys.filter((x) => x.equivalent_code)) {
  const alvo = [...mapaBeys.entries()].find(
    ([k]) => k.startsWith(`takara_tomy|${b.equivalent_code}|`),
  )?.[1];
  if (!alvo) {
    console.warn(`equivalente takara_tomy não encontrado para ${b.release_code}`);
    continue;
  }
  const { error } = await db.from("beyblades").update({ equivalent_id: alvo })
    .match({ brand: b.brand, release_code: b.release_code, name: b.name });
  if (error) throw error;
  equivalencias++;
}

console.log(
  `seed concluído: ${partes.length} peças, ${beys.length} beys, ` +
    `${ligacoes.length} ligações, ${equivalencias} equivalências`,
);
