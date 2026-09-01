import { Link, useParams } from "react-router-dom";
import { T } from "../theme.ts";
import { useBey } from "../hooks/useBey.ts";
import { somaBruta } from "../hooks/useCatalog.ts";
import { urlImagem } from "../lib/imagens.ts";
import AvisoDivergencia from "./AvisoDivergencia.tsx";
import ControleInventario from "./ControleInventario.tsx";
import {
  COR_TIPO, ROTULO_TIPO, MARCA, ROTULO_SLOT,
  ROTULO_RARIDADE, COR_RARIDADE, ROTULO_LANCAMENTO,
} from "./rotulos.ts";

export default function DetalheBey() {
  const { id } = useParams();
  const { bey, irmaos, error, loading } = useBey(id);

  if (loading) return <p style={{ color: T.textMuted }}>Carregando…</p>;
  if (error || !bey) {
    return (
      <div>
        <p style={{ color: T.danger }}>{error ?? "Beyblade não encontrado"}</p>
        <Link to="/" style={{ color: T.accent }}>← voltar ao catálogo</Link>
      </div>
    );
  }

  const soma = somaBruta(bey.pecas);
  const cor = bey.bey_type ? COR_TIPO[bey.bey_type] : T.textMuted;
  const marca = MARCA[bey.brand];
  const imagem = urlImagem(bey.image_path);
  const maxAtributo = Math.max(100, soma.attack, soma.defense, soma.stamina);

  return (
    <article>
      <Link to="/" style={{ color: T.textMuted, fontSize: 13 }}>← catálogo</Link>

      <header style={{ margin: "14px 0 20px" }}>
        <div style={{ color: T.textMuted, fontSize: 13, letterSpacing: 0.4 }}>
          {bey.release_code}
          {bey.release_date && ` · ${bey.release_date}`}
        </div>
        <h2 style={{ margin: "4px 0 10px", fontSize: 26 }}>{bey.name}</h2>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {bey.bey_type && (
            <span style={{
              color: cor, border: `1px solid ${cor}77`, background: `${cor}1f`,
              borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
            }}>{ROTULO_TIPO[bey.bey_type]}</span>
          )}
          <span style={{
            color: marca.cor, border: `1px solid ${marca.cor}44`,
            background: `${marca.cor}14`, borderRadius: 999,
            padding: "3px 11px", fontSize: 12.5,
          }}>{marca.rotulo}</span>
          <span style={{
            color: COR_RARIDADE[bey.rarity],
            border: `1px solid ${T.border}`, borderRadius: 999,
            padding: "3px 11px", fontSize: 12.5,
          }}>{ROTULO_RARIDADE[bey.rarity]}</span>
          <span style={{
            color: T.textSecondary, border: `1px solid ${T.border}`,
            borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
          }}>{ROTULO_LANCAMENTO[bey.release_type] ?? bey.release_type}</span>
        </div>
      </header>

      <div style={{ marginBottom: 18 }}>
        <ControleInventario beybladeId={bey.id} />
      </div>

      <div style={{
        display: "grid", gap: 18,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}>
        <section style={{
          background: T.bgCard, border: `1px solid ${T.border}`,
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            aspectRatio: "16 / 9", maxHeight: 240,
            // Fundo claro, pelo mesmo motivo do card (ver BeyCard.tsx).
            background: `linear-gradient(140deg, #ffffff, #e8ecf1 70%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {imagem ? (
              <img src={imagem} alt={bey.name}
                   style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <svg viewBox="0 0 64 64" width="72" height="72" style={{ opacity: 0.22 }}>
                <circle cx="32" cy="32" r="19" fill="none" stroke={cor} strokeWidth="5" />
                <circle cx="32" cy="32" r="6" fill={cor} />
              </svg>
            )}
          </div>

          <div style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: T.textSecondary }}>
              Atributos somados
            </h3>
            {([
              ["Ataque", soma.attack, T.typeAttack],
              ["Defesa", soma.defense, T.typeDefense],
              ["Resistência", soma.stamina, T.typeStamina],
            ] as const).map(([rotulo, valor, corBarra]) => (
              <div key={rotulo} style={{
                display: "flex", alignItems: "center", gap: 9,
                fontSize: 12.5, marginBottom: 6,
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
                <span style={{ color: T.textPrimary, width: 30, textAlign: "right" }}>
                  {valor}
                </span>
              </div>
            ))}
            <p style={{ margin: "12px 0 0", fontSize: 12, color: T.textMuted }}>
              Peso total {soma.weight_g.toFixed(1)} g
              {soma.pesoParcial && " (parcial — alguma peça sem peso registrado)"}
            </p>
          </div>
        </section>

        <section>
          <h3 style={{ margin: "0 0 10px", fontSize: 14, color: T.textSecondary }}>
            Composição · contribuição de cada peça
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {bey.pecas.map(({ slot, part }) => (
              <Link key={slot} to={`/peca/${part.id}`} style={{
                textDecoration: "none", color: "inherit",
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: 9, padding: "11px 13px", display: "block",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ color: T.textMuted, fontSize: 11 }}>
                      {ROTULO_SLOT[slot] ?? slot}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{part.name}</div>
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 11.5, textAlign: "right" }}>
                    {part.weight_g != null && `${part.weight_g} g`}
                    {part.height_mm != null && ` · ${part.height_mm} mm`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 7, fontSize: 12 }}>
                  <span style={{ color: T.typeAttack }}>ATQ {part.attack}</span>
                  <span style={{ color: T.typeDefense }}>DEF {part.defense}</span>
                  <span style={{ color: T.typeStamina }}>RES {part.stamina}</span>
                </div>
              </Link>
            ))}
          </div>

          {irmaos.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: T.textSecondary }}>
                Também vendido como
              </h3>
              <div style={{ display: "grid", gap: 6 }}>
                {irmaos.map((irmao) => (
                  <Link key={irmao.id} to={`/bey/${irmao.id}`} style={{
                    color: T.textSecondary, fontSize: 13, textDecoration: "none",
                    background: T.bgCard, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: "8px 11px",
                  }}>
                    <strong style={{ color: T.textPrimary }}>{irmao.release_code}</strong>
                    {" — "}
                    {ROTULO_LANCAMENTO[irmao.release_type] ?? irmao.release_type}
                  </Link>
                ))}
              </div>
              <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 7 }}>
                Mesma composição, embalagem diferente.
              </p>
            </div>
          )}

          {bey.rarity_reason && (
            <div style={{
              marginTop: 16,
              background: `${COR_RARIDADE[bey.rarity]}10`,
              border: `1px solid ${COR_RARIDADE[bey.rarity]}40`,
              borderRadius: 9, padding: "11px 13px",
            }}>
              <strong style={{ color: COR_RARIDADE[bey.rarity], fontSize: 13 }}>
                Por que é {ROTULO_RARIDADE[bey.rarity].toLowerCase()}
              </strong>
              <p style={{ margin: "5px 0 0", color: T.textSecondary,
                          fontSize: 13, lineHeight: 1.6 }}>
                {bey.rarity_reason}
              </p>
            </div>
          )}

          <AvisoDivergencia ativo={bey.data_disputed} detalhe={bey.notes} />

          {bey.notes && !bey.data_disputed && (
            <p style={{
              marginTop: 16, color: T.textSecondary, fontSize: 13,
              background: T.bgCard, border: `1px solid ${T.border}`,
              borderRadius: 9, padding: "11px 13px",
            }}>{bey.notes}</p>
          )}

          <p style={{ marginTop: 16, fontSize: 11.5, color: T.textMuted }}>
            Fonte: <a href={bey.source_url} style={{ color: T.accentDim }}>{bey.source_url}</a>
          </p>
        </section>
      </div>
    </article>
  );
}
