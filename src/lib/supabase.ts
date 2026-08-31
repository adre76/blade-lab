import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./env.ts";

const { url, anonKey } = readSupabaseEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
);

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
