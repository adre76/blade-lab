/**
 * Lista (e opcionalmente remove) linhas do catálogo que não existem mais nos
 * arquivos de dados.
 *
 * O seed é upsert puro: acrescenta e atualiza, nunca apaga. Isso é o que o torna
 * seguro para rodar a qualquer momento, mas deixa para trás o que sai do
 * catálogo — uma peça renomeada ou um produto que se descobriu inexistente.
 *
 *   npm run obsoletos           lista
 *   npm run obsoletos -- --apagar  remove
 *
 * A remoção passa pelo que o inventário referencia: se alguém já registrou o
 * bey, ele não sai sem aviso.
 */
import { createClient } from "@supabase/supabase-js";
import { carregarPartes, carregarBeyblades } from "../src/lib/seed/carregar.ts";

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.seed)");
  process.exit(1);
}

const apagar = process.argv.includes("--apagar");
const db = createClient(url, chave, { auth: { persistSession: false } });

const RAIZ = new URL("../data/", import.meta.url);
const partes = carregarPartes(RAIZ);
const beys = carregarBeyblades(RAIZ);

const chavePeca = (b: string, s: string, n: string) => `${b}|${s}|${n}`;
const chaveBey = (b: string, c: string, n: string) => `${b}|${c}|${n}`;

const partesArquivo = new Set(partes.map((p) => chavePeca(p.brand, p.slot, p.name)));
const beysArquivo = new Set(beys.map((b) => chaveBey(b.brand, b.release_code, b.name)));

const { data: partesDb, error: e1 } = await db.from("parts").select("id,brand,slot,name");
const { data: beysDb, error: e2 } = await db.from("beyblades").select("id,brand,release_code,name");
if (e1 || e2) {
  console.error("leitura falhou:", e1 ?? e2);
  process.exit(1);
}

const partesSobrando = (partesDb ?? []).filter(
  (p) => !partesArquivo.has(chavePeca(p.brand, p.slot, p.name)),
);
const beysSobrando = (beysDb ?? []).filter(
  (b) => !beysArquivo.has(chaveBey(b.brand, b.release_code, b.name)),
);

console.log(`peças no banco: ${partesDb?.length} | nos arquivos: ${partes.length}`);
console.log(`beys  no banco: ${beysDb?.length} | nos arquivos: ${beys.length}`);
console.log(`\nobsoletos: ${partesSobrando.length} peças, ${beysSobrando.length} beys`);
for (const p of partesSobrando) console.log(`  peça  ${p.slot} ${p.name} (${p.brand})`);
for (const b of beysSobrando) console.log(`  bey   ${b.release_code} ${b.name} (${b.brand})`);

if (!partesSobrando.length && !beysSobrando.length) process.exit(0);

// Um bey obsoleto que alguém já registrou não sai calado.
const ids = beysSobrando.map((b) => b.id);
if (ids.length) {
  const { data: usados } = await db
    .from("inventory_items")
    .select("beyblade_id")
    .in("beyblade_id", ids);
  if (usados?.length) {
    console.log(`\nATENÇÃO: ${usados.length} item(ns) de inventário apontam para esses beys.`);
  }
}

if (!apagar) {
  console.log("\nnada removido. rode com --apagar para remover.");
  process.exit(0);
}

if (beysSobrando.length) {
  const { error } = await db.from("beyblades").delete().in("id", ids);
  if (error) {
    console.error("remoção de beys falhou:", error);
    process.exit(1);
  }
}
if (partesSobrando.length) {
  const { error } = await db
    .from("parts")
    .delete()
    .in("id", partesSobrando.map((p) => p.id));
  if (error) {
    console.error("remoção de peças falhou:", error);
    process.exit(1);
  }
}
console.log(`\nremovidos: ${partesSobrando.length} peças, ${beysSobrando.length} beys`);
