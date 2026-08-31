export type SupabaseEnv = { url: string; anonKey: string };

/** Lê e valida as variáveis do Supabase. Recebe o objeto de ambiente para ser testável. */
export function readSupabaseEnv(source: Record<string, string | undefined>): SupabaseEnv {
  const url = source["VITE_SUPABASE_URL"]?.trim();
  const anonKey = source["VITE_SUPABASE_ANON_KEY"]?.trim();

  if (!url) throw new Error("Variável de ambiente ausente: VITE_SUPABASE_URL");
  if (!anonKey) throw new Error("Variável de ambiente ausente: VITE_SUPABASE_ANON_KEY");

  return { url, anonKey };
}
