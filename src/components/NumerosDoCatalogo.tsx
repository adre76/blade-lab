import { useMemo } from "react";
import { T } from "../theme.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { ROTULO_TIPO, COR_TIPO, ROTULO_RARIDADE, COR_RARIDADE } from "./rotulos.ts";
import type { Database } from "../types/database.ts";

type BeyType = Database["public"]["Enums"]["bey_type"];
type Rarity = Database["public"]["Enums"]["rarity"];

/**
 * Contagens do catálogo, calculadas na hora.
 *
 * Escrever "61 beys são de ataque" no texto do FAQ garantiria que o número
 * ficasse errado na primeira vez que o catálogo crescesse. Estes componentes
 * são o que permite ao FAQ mostrar número sem prometer manutenção manual.
 */
function Linha({ rotulo, valor, total, cor }: {
  rotulo: string; valor: number; total: number; cor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
      <span style={{ width: 96, fontSize: 12.5, color: T.textSecondary }}>{rotulo}</span>
      <span style={{ flex: 1, height: 7, background: T.bgInput, borderRadius: 4 }}>
        <span style={{
          display: "block", height: "100%", borderRadius: 4, background: cor,
          width: total > 0 ? `${(valor / total) * 100}%` : 0,
        }} />
      </span>
      <span style={{ width: 34, textAlign: "right", fontSize: 12.5, color: T.textPrimary }}>
        {valor}
      </span>
    </div>
  );
}

export function DistribuicaoPorTipo() {
  const { composicoes, loading } = useCatalog();

  const contagem = useMemo(() => {
    const m = new Map<BeyType, number>();
    for (const c of composicoes) {
      const t = c.lancamentos[0]?.bey_type;
      if (t) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [composicoes]);

  if (loading || !contagem.length) return null;
  const total = contagem.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ margin: "12px 0 4px" }}>
      {contagem.map(([tipo, n]) => (
        <Linha key={tipo} rotulo={ROTULO_TIPO[tipo]} valor={n} total={total}
               cor={COR_TIPO[tipo]} />
      ))}
      <p style={{ color: T.textMuted, fontSize: 11.5, margin: "6px 0 0" }}>
        Como estão divididas as {total} composições do catálogo, agora.
      </p>
    </div>
  );
}

export function DistribuicaoPorRaridade() {
  const { composicoes, loading } = useCatalog();

  const contagem = useMemo(() => {
    const ordem: Rarity[] = ["common", "uncommon", "rare", "very_rare", "exclusive"];
    return ordem
      .map((r) => [r, composicoes.filter((c) => c.raridade === r).length] as const)
      .filter(([, n]) => n > 0);
  }, [composicoes]);

  if (loading || !contagem.length) return null;
  const total = contagem.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ margin: "12px 0 4px" }}>
      {contagem.map(([r, n]) => (
        <Linha key={r} rotulo={ROTULO_RARIDADE[r]} valor={n} total={total}
               cor={COR_RARIDADE[r]} />
      ))}
      <p style={{ color: T.textMuted, fontSize: 11.5, margin: "6px 0 0" }}>
        Quantas composições caem em cada degrau, agora.
      </p>
    </div>
  );
}
