import { Link, useParams } from "react-router-dom";
import { T } from "../theme.ts";
import { usePeca } from "../hooks/usePeca.ts";
import {
  COR_TIPO, ROTULO_TIPO, MARCA, ROTULO_SLOT, ROTULO_RARIDADE,
  ROTULO_LANCAMENTO, ROTULO_RESISTENCIA, ROTULO_GIRO, ROTULO_LINHA,
} from "./rotulos.ts";

function Dado({ rotulo, valor }: { rotulo: string; valor: string | number | null | undefined }) {
  if (valor == null || valor === "") return null;
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: "9px 12px",
    }}>
      <div style={{ color: T.textMuted, fontSize: 11 }}>{rotulo}</div>
      <div style={{ fontSize: 14.5, marginTop: 2 }}>{valor}</div>
    </div>
  );
}

export default function DetalhePeca() {
  const { id } = useParams();
  const { peca, beys, error, loading } = usePeca(id);

  if (loading) return <p style={{ color: T.textMuted }}>Carregando…</p>;
  if (error || !peca) {
    return (
      <div>
        <p style={{ color: T.danger }}>{error ?? "Peça não encontrada"}</p>
        <Link to="/" style={{ color: T.accent }}>← voltar ao catálogo</Link>
      </div>
    );
  }

  const cor = peca.part_type ? COR_TIPO[peca.part_type] : T.accent;
  const marca = MARCA[peca.brand];
  const maxAtributo = Math.max(60, peca.attack, peca.defense, peca.stamina);

  return (
    <article>
      <Link to="/" style={{ color: T.textMuted, fontSize: 13 }}>← catálogo</Link>

      <header style={{ margin: "14px 0 20px" }}>
        <div style={{ color: T.textMuted, fontSize: 13 }}>
          {ROTULO_SLOT[peca.slot]}
          {peca.code && ` · ${peca.code}`}
        </div>
        <h2 style={{ margin: "4px 0 10px", fontSize: 26 }}>{peca.name}</h2>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {peca.part_type && (
            <span style={{
              color: cor, border: `1px solid ${cor}77`, background: `${cor}1f`,
              borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
            }}>{ROTULO_TIPO[peca.part_type]}</span>
          )}
          <span style={{
            color: marca.cor, border: `1px solid ${marca.cor}44`,
            background: `${marca.cor}14`, borderRadius: 999,
            padding: "3px 11px", fontSize: 12.5,
          }}>{marca.rotulo}</span>
          <span style={{
            color: T.textSecondary, border: `1px solid ${T.border}`,
            borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
          }}>{ROTULO_LINHA[peca.line]}</span>
        </div>
      </header>

      <section style={{ marginBottom: 22 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: T.textSecondary }}>
          Atributos
        </h3>
        {([
          ["Ataque", peca.attack, T.typeAttack],
          ["Defesa", peca.defense, T.typeDefense],
          ["Stamina", peca.stamina, T.typeStamina],
        ] as const).map(([rotulo, valor, corBarra]) => (
          <div key={rotulo} style={{
            display: "flex", alignItems: "center", gap: 9,
            fontSize: 12.5, marginBottom: 6, maxWidth: 420,
          }}>
            <span style={{ color: T.textMuted, width: 60 }}>{rotulo}</span>
            <div style={{
              flex: 1, height: 7, background: T.bgInput,
              borderRadius: 4, overflow: "hidden",
            }}>
              <div style={{
                width: `${(valor / maxAtributo) * 100}%`,
                height: "100%", background: corBarra,
              }} />
            </div>
            <span style={{ color: T.textPrimary, width: 26, textAlign: "right" }}>
              {valor}
            </span>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 22 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, color: T.textSecondary }}>
          Dados físicos
        </h3>
        <div style={{
          display: "grid", gap: 8,
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        }}>
          <Dado rotulo="Peso" valor={peca.weight_g != null ? `${peca.weight_g} g` : null} />
          <Dado rotulo="Altura" valor={peca.height_mm != null ? `${peca.height_mm} mm` : null} />
          <Dado rotulo="Pontos de contato" valor={peca.contact_points} />
          <Dado rotulo="Sentido de giro"
                valor={peca.spin_direction ? ROTULO_GIRO[peca.spin_direction] : null} />
          <Dado rotulo="Resistência a burst"
                valor={peca.burst_resistance ? ROTULO_RESISTENCIA[peca.burst_resistance] : null} />
          <Dado rotulo="Dash"
                valor={peca.dash_performance ? ROTULO_RESISTENCIA[peca.dash_performance] : null} />
        </div>
      </section>

      <section>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, color: T.textSecondary }}>
          Onde conseguir esta peça
        </h3>
        <p style={{ color: T.textMuted, fontSize: 12, margin: "0 0 10px" }}>
          Do mais fácil de achar para o mais raro.
        </p>
        <div style={{
          display: "grid", gap: 8,
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        }}>
          {beys.map((b) => (
            <Link key={b.id} to={`/bey/${b.id}`} style={{
              textDecoration: "none", color: "inherit",
              background: T.bgCard, border: `1px solid ${T.border}`,
              borderRadius: 9, padding: "10px 13px",
            }}>
              <div style={{ color: T.textMuted, fontSize: 11 }}>
                {b.release_code}
                {b.release_date && ` · ${b.release_date.slice(0, 4)}`}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
              <div style={{
                marginTop: 5, fontSize: 11.5,
                display: "flex", justifyContent: "space-between", gap: 8,
              }}>
                <span style={{ color: T.textMuted }}>
                  {ROTULO_LANCAMENTO[b.release_type] ?? b.release_type}
                </span>
                <span style={{ color: b.rarity === "common" ? T.textMuted : T.accentWarm }}>
                  {ROTULO_RARIDADE[b.rarity]}
                </span>
              </div>
            </Link>
          ))}
        </div>
        {beys.length === 0 && (
          <p style={{ color: T.textMuted, fontSize: 13 }}>
            Nenhum bey de fábrica registrado com esta peça.
          </p>
        )}
      </section>

      {peca.notes && (
        <p style={{
          marginTop: 18, color: T.textSecondary, fontSize: 13,
          background: T.bgCard, border: `1px solid ${T.border}`,
          borderRadius: 9, padding: "11px 13px",
        }}>{peca.notes}</p>
      )}

      <p style={{ marginTop: 16, fontSize: 11.5, color: T.textMuted }}>
        Fonte: <a href={peca.source_url} style={{ color: T.accentDim }}>{peca.source_url}</a>
      </p>
    </article>
  );
}
