import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./env.ts";
import type { Database } from "../types/database.ts";

const { url, anonKey } = readSupabaseEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
);

// O generic <Database> e o que faz toda consulta ser tipada. Sem ele,
// src/types/database.ts vira arquivo morto e cada row volta como any.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
