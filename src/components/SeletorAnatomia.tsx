import { T } from "../theme.ts";
import { ROTULO_ANATOMIA, ROTULO_SLOT } from "./rotulos.ts";
import { slotsDe } from "../lib/engine/slots.ts";
import type { Anatomy } from "../lib/engine/types.ts";

/**
 * Escolha de como o bey é montado, antes de escolher as peças.
 *
 * A composição vem de `slotsDe`, e não de uma lista escrita aqui: é a mesma
 * fonte que popula `anatomy_slots` no banco, e é o que garante que a legenda de
 * cada opção descreva os seletores que ela realmente abre.
 */
export default function SeletorAnatomia({ opcoes, atual, aoTrocar }: {
  opcoes: Anatomy[];
  atual: Anatomy;
  aoTrocar: (anatomy: Anatomy) => void;
}) {
  // Uma opção só não é escolha: enquanto o catálogo montar uma anatomia
  // apenas, o seletor é ruído e some.
  if (opcoes.length < 2) return null;

  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 9, padding: 12,
    }}>
      <strong style={{ fontSize: 13, color: T.textSecondary }}>Montagem</strong>

      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {opcoes.map((a) => {
          const ativa = a === atual;
          return (
            <button
              key={a}
              onClick={() => aoTrocar(a)}
              aria-pressed={ativa}
              style={{
                textAlign: "left", cursor: "pointer", borderRadius: 7,
                padding: "7px 10px",
                background: ativa ? `${T.accent}22` : "transparent",
                border: `1px solid ${ativa ? T.accent : T.border}`,
                color: ativa ? T.accent : T.textSecondary,
              }}
            >
              <div style={{ fontSize: 13 }}>{ROTULO_ANATOMIA[a]}</div>
              <div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 2 }}>
                {slotsDe(a).map((s) => ROTULO_SLOT[s]).join(" · ")}
              </div>
            </button>
          );
        })}
      </div>

      {/*
        Trocar de anatomia descarta as peças dos slots que a nova não tem — a
        serialização só grava os slots da anatomia corrente. Dizer isso antes
        vale mais que explicar depois, quando a peça já sumiu da tela.
      */}
      <p style={{ color: T.textMuted, fontSize: 11.5, margin: "9px 0 0", lineHeight: 1.5 }}>
        Trocar a montagem descarta as peças que não couberem na nova.
      </p>
    </div>
  );
}
