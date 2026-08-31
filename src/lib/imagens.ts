import { supabase } from "./supabase.ts";

const BUCKET = "bey-images";

/**
 * Monta a URL pública de uma imagem do catálogo.
 *
 * O banco guarda o caminho relativo dentro do bucket, não a URL completa
 * (spec §4.10) — assim trocar de host não exige migrar dados. A montagem da URL
 * é responsabilidade daqui.
 *
 * Devolve null quando não há imagem, que é o caso de todo o catálogo até a onda
 * de imagens: o card cai no placeholder.
 */
export function urlImagem(caminho: string | null): string | null {
  if (!caminho) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return data.publicUrl;
}
