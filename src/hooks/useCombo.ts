import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { desserializar, serializar } from "../lib/engine/serializacao.ts";
import type { Anatomy, Combo, PartSlot, Peca } from "../lib/engine/types.ts";

/**
 * O combo em montagem, guardado na querystring.
 *
 * Na URL e não em estado local porque o link tem de ser compartilhável
 * (spec §3.2) e sobreviver a um recarregamento. `replace: true` evita encher o
 * histórico do navegador a cada peça trocada — o botão voltar deve sair do
 * laboratório, não desfazer escolha por escolha.
 */
export function useCombo(catalogo: Peca[], anatomiaPadrao: Anatomy = "basic") {
  const [params, setParams] = useSearchParams();

  const porId = useCallback(
    (id: string) => catalogo.find((p) => p.id === id) ?? null,
    [catalogo],
  );

  const combo: Combo = useMemo(() => {
    const vazio: Combo = { anatomy: anatomiaPadrao, pecas: {} };
    const bruto = params.get("combo");
    if (!bruto) return vazio;
    return desserializar(bruto, porId) ?? vazio;
  }, [params, porId, anatomiaPadrao]);

  const gravar = useCallback((novo: Combo) => {
    const p = new URLSearchParams(params);
    p.set("combo", serializar(novo));
    setParams(p, { replace: true });
  }, [params, setParams]);

  const porSlot = useCallback((slot: PartSlot, peca: Peca | null) => {
    const pecas = { ...combo.pecas };
    if (peca) pecas[slot] = peca;
    else delete pecas[slot];
    gravar({ ...combo, pecas });
  }, [combo, gravar]);

  /**
   * Trocar de anatomia descarta as peças em slots que a nova não tem — quem
   * cuida disso é a serialização, que só grava os slots da anatomia corrente.
   */
  const trocarAnatomia = useCallback((anatomy: Anatomy) => {
    gravar({ anatomy, pecas: combo.pecas });
  }, [combo.pecas, gravar]);

  return { combo, porSlot, trocarAnatomia };
}
