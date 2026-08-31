import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "./env.ts";

describe("readSupabaseEnv", () => {
  it("devolve as duas variáveis quando ambas estão presentes", () => {
    const env = readSupabaseEnv({
      VITE_SUPABASE_URL: "https://exemplo.supabase.co",
      VITE_SUPABASE_ANON_KEY: "chave-anon",
    });
    expect(env).toEqual({
      url: "https://exemplo.supabase.co",
      anonKey: "chave-anon",
    });
  });

  it("lança erro nomeando a variável que falta", () => {
    expect(() => readSupabaseEnv({ VITE_SUPABASE_URL: "https://exemplo.supabase.co" }))
      .toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it("trata string vazia como ausente", () => {
    expect(() => readSupabaseEnv({ VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "k" }))
      .toThrow(/VITE_SUPABASE_URL/);
  });
});
