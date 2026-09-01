/**
 * Cria (ou remove) um usuário de teste, para validar o fluxo autenticado sem
 * depender de um login OAuth interativo.
 *
 * Não faz parte do produto: existe para que o inventário, o RLS e a view de
 * estoque possam ser exercitados de ponta a ponta em desenvolvimento. O app
 * continua expondo apenas o Google (spec §2).
 *
 *   npm run usuario-teste          cria e imprime as credenciais
 *   npm run usuario-teste -- --remover   apaga
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !serviceKey) {
  console.error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver .env.seed.example)");
  process.exit(1);
}

const EMAIL = "teste-local@blade-x-lab.invalid";
const SENHA = "teste-local-nao-usar-em-producao";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: existentes } = await admin.auth.admin.listUsers();
const jaExiste = existentes?.users.find((u) => u.email === EMAIL);

if (process.argv.includes("--remover")) {
  if (!jaExiste) {
    console.log("nada a remover");
    process.exit(0);
  }
  const { error } = await admin.auth.admin.deleteUser(jaExiste.id);
  if (error) throw error;
  console.log("usuário de teste removido");
  process.exit(0);
}

if (jaExiste) {
  console.log(`já existe: ${EMAIL}`);
} else {
  const { error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
    user_metadata: { full_name: "Usuário de Teste" },
  });
  if (error) throw error;
  console.log(`criado: ${EMAIL}`);
}

// O perfil deve nascer do trigger handle_new_user, não de escrita nossa.
const { data: perfil } = await admin
  .from("profiles").select("id, display_name").eq("id", jaExiste?.id ?? "").maybeSingle();

const { data: todos } = await admin.auth.admin.listUsers();
const u = todos?.users.find((x) => x.email === EMAIL);
const { data: p } = await admin
  .from("profiles").select("display_name").eq("id", u?.id ?? "").maybeSingle();

console.log(`perfil criado pelo trigger: ${p?.display_name ?? perfil?.display_name ?? "(NENHUM — trigger falhou)"}`);
console.log(`\nsenha: ${SENHA}`);
