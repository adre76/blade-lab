/**
 * Sincroniza a tabela anatomy_slots a partir de data/anatomies.json.
 *
 * Esta e a UNICA tabela sincronizada de forma destrutiva (spec 4.3). O upsert
 * idempotente usado no resto do catalogo deixaria viva uma linha obsoleta — e
 * obsoleta justamente na tabela que o trigger validate_combo_slots consulta,
 * o que faria o banco aceitar combos com um slot que a anatomia nao tem mais.
 * E tabela de referencia minuscula e sem dados de usuario: apagar e seguro.
 *
 * Uso (a service_role key vem do ambiente, NUNCA de arquivo versionado):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run sync:anatomies
 */
import { readFileSync } from "node:fs";
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
      "     (Supabase > Project Settings > API Keys)",
      "  3. rode de novo",
      "",
      "O .env.seed é ignorado pelo git. NÃO cole essa chave em chat nem em",
      "arquivo versionado: ela ignora todo o RLS.",
    ].join("\n"),
  );
  process.exit(1);
}

const anatomies = JSON.parse(
  readFileSync(new URL("../data/anatomies.json", import.meta.url), "utf8"),
) as Record<string, string[]>;

const rows = Object.entries(anatomies).flatMap(([anatomy, slots]) =>
  slots.map((slot) => ({ anatomy, slot })),
);

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// NAO use o idioma .neq(col, "valor_impossivel") aqui: `anatomy` e coluna de
// enum, e o Postgres tenta coagir o literal ao tipo, falhando com
// "invalid input value for enum anatomy". O script morreria antes do insert e
// deixaria a tabela VAZIA — sem fonte de verdade para validate_combo_slots.
const { error: delErr } = await db.from("anatomy_slots").delete().not("anatomy", "is", null);
if (delErr) throw delErr;

const { error: insErr } = await db.from("anatomy_slots").insert(rows);
if (insErr) throw insErr;

console.log(`anatomy_slots sincronizada: ${rows.length} linhas`);
