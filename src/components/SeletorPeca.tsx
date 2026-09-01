import { useState } from "react";
import { T } from "../theme.ts";
import { ROTULO_SLOT } from "./rotulos.ts";
import { casaTermos, termosDaBusca } from "../lib/busca.ts";
import type { PartSlot, Peca } from "../lib/engine/types.ts";

/**
 * Escolha de peça para um slot.
 *
 * Lista só peças do slot pedido — o motor recusaria as outras, e oferecer o que
 * não pode ser escolhido é convidar ao erro. A busca reusa `casaTermos`, então
 * "catraca" e "ratchet" funcionam aqui como no catálogo, e o nome alternativo
 * também acha.
 */
export default function SeletorPeca({
  slot, pecas, escolhida, aoEscolher,
}: {
  slot: PartSlot;
  pecas: Peca[];
  escolhida: Peca | undefined;
  aoEscolher: (peca: Peca | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const candidatas = pecas.filter((p) => p.slot === slot);
  const termos = termosDaBusca(busca);
  const filtradas = candidatas.filter((p) =>
    casaTermos([p.name, ...(p.aka ?? [])].join(" "), termos),
  );

  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 9, padding: 12,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 8, gap: 8,
      }}>
        <strong style={{ fontSize: 13, color: T.textSecondary }}>{ROTULO_SLOT[slot]}</strong>
        {escolhida ? (
          <button onClick={() => aoEscolher(null)}
                  style={{ background: "none", border: "none", color: T.textMuted,
                           fontSize: 12, cursor: "pointer", padding: 0 }}>
            limpar
          </button>
        ) : (
          <span style={{ color: T.textMuted, fontSize: 11.5 }}>{candidatas.length} opções</span>
        )}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={`Buscar ${ROTULO_SLOT[slot].toLowerCase()}…`}
        style={{
          width: "100%", boxSizing: "border-box", background: T.bgInput,
          color: T.textPrimary, border: `1px solid ${T.border}`, borderRadius: 7,
          padding: "6px 9px", fontSize: 13, outline: "none", marginBottom: 8,
        }}
      />

      <div style={{ maxHeight: 190, overflowY: "auto", display: "grid", gap: 4 }}>
        {filtradas.map((p) => {
          const ativa = escolhida?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => aoEscolher(p)}
              style={{
                textAlign: "left", cursor: "pointer", borderRadius: 6,
                padding: "6px 9px", fontSize: 13,
                background: ativa ? `${T.accent}22` : "transparent",
                border: `1px solid ${ativa ? T.accent : "transparent"}`,
                color: ativa ? T.accent : T.textSecondary,
              }}
            >
              {p.name}
              <span style={{ color: T.textMuted, marginLeft: 8, fontSize: 11.5 }}>
                ATQ {p.attack} · DEF {p.defense} · RES {p.stamina}
              </span>
            </button>
          );
        })}
        {!filtradas.length && (
          <p style={{ color: T.textMuted, fontSize: 12.5, margin: 4 }}>Nada encontrado.</p>
        )}
      </div>
    </div>
  );
}
