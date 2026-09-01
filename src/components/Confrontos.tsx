import { T } from "../theme.ts";
import { ROTULO_TIPO, COR_TIPO } from "./rotulos.ts";
import type { Confronto } from "../lib/engine/matchup.ts";
import type { BeyType } from "../lib/engine/types.ts";

/**
 * Contra que TIPOS este conjunto costuma se dar bem e mal.
 *
 * Nunca contra beys, e nunca com número. A ressalva ao pé não é disclaimer
 * decorativo: lançamento, estádio e sorte decidem uma batalha, e a spec §5.7
 * reserva a estimativa de vitória para uma onda que exige calibração. O que
 * está aqui é a tendência entre tipos que a fonte publica.
 */
/**
 * A direção vem por parâmetro, e não do texto do rótulo.
 *
 * A primeira versão decidia a seta com `rotulo.startsWith("Leva")` — e os dois
 * rótulos começam com "Leva", então as duas linhas saíam com a mesma seta.
 */
function Tipos({ rotulo, tipos, cor, seta }: {
  rotulo: string; tipos: BeyType[]; cor: string; seta: "▲" | "▼";
}) {
  if (!tipos.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <span style={{ color: cor, fontSize: 12, lineHeight: 1 }} aria-hidden="true">{seta}</span>
      <span style={{ color: T.textMuted, fontSize: 12, width: 108 }}>{rotulo}</span>
      {tipos.map((t) => (
        <span key={t} style={{
          color: COR_TIPO[t], border: `1px solid ${COR_TIPO[t]}55`,
          background: `${COR_TIPO[t]}14`, borderRadius: 999,
          padding: "2px 10px", fontSize: 12.5,
        }}>{ROTULO_TIPO[t]}</span>
      ))}
    </div>
  );
}

export default function Confrontos({ confronto }: { confronto: Confronto }) {
  const { vence, perde, porque, alertas } = confronto;
  if (!vence.length && !perde.length && !alertas.length) return null;

  return (
    <section style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "14px 16px", marginTop: 16,
    }}>
      <h3 style={{ margin: "0 0 11px", fontSize: 14, color: T.textSecondary }}>
        Contra quem costuma se dar bem
      </h3>

      <Tipos rotulo="Leva vantagem sobre" tipos={vence} cor={T.typeStamina} seta="▲" />
      <Tipos rotulo="Leva desvantagem contra" tipos={perde} cor={T.danger} seta="▼" />

      {porque && (
        <p style={{
          margin: "10px 0 0", color: T.textSecondary, fontSize: 13, lineHeight: 1.65,
        }}>{porque}</p>
      )}

      {!porque && !alertas.length && (
        <p style={{ margin: 0, color: T.textSecondary, fontSize: 13, lineHeight: 1.65 }}>
          Equilibrado não tem tipo contra o qual leve vantagem clara — nem
          desvantagem. É a escolha de quem não sabe o que o adversário vai trazer.
        </p>
      )}

      {alertas.map((a) => (
        <p key={a} style={{
          margin: "10px 0 0", color: T.textSecondary, fontSize: 13, lineHeight: 1.65,
        }}>{a}</p>
      ))}

      <p style={{ margin: "12px 0 0", color: T.textMuted, fontSize: 11.5, lineHeight: 1.55 }}>
        Tendência entre tipos, não previsão de resultado. Quem ganha uma batalha
        depende também do lançamento, do estádio e da sorte.
      </p>
    </section>
  );
}
