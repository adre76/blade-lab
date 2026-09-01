import { useMemo } from "react";
import { Link } from "react-router-dom";
import { T } from "../theme.ts";
import { useCatalog, comboDoCatalogo } from "../hooks/useCatalog.ts";
import { useCombo } from "../hooks/useCombo.ts";
import { useAuth } from "../hooks/AuthContext.tsx";
import { useEstoquePecas } from "../hooks/useEstoquePecas.ts";
import SeletorPeca from "./SeletorPeca.tsx";
import { ROTULO_SLOT, COR_TIPO } from "./rotulos.ts";
import { slotsDe } from "../lib/engine/slots.ts";
import { validar } from "../lib/engine/compatibility.ts";
import { agregar } from "../lib/engine/stats.ts";
import { derivarContexto, normalizar } from "../lib/engine/normalization.ts";
import { classificar } from "../lib/engine/archetype.ts";
import { contribuicoes } from "../lib/engine/explain.ts";
import { faltaNoInventario } from "../lib/engine/posse.ts";
import { DESCONHECIDO } from "../lib/engine/types.ts";

const ATRIBUTOS = [
  ["attack", "Ataque", COR_TIPO.attack],
  ["defense", "Defesa", COR_TIPO.defense],
  ["stamina", "Resistência", COR_TIPO.stamina],
] as const;

const caixa = {
  background: T.bgCard,
  border: `1px solid ${T.border}`,
  borderRadius: 9,
  padding: 14,
};

export default function Laboratorio() {
  const { composicoes, pecas, loading, error } = useCatalog();
  const { combo, porSlot } = useCombo(pecas);
  const { usuario } = useAuth();
  const { porId: estoque } = useEstoquePecas();

  /**
   * O denominador vem do catálogo INTEIRO (spec §5.4), e os quartis de peso,
   * dos beys de fábrica — a referência que o usuário tem na mão.
   *
   * A população é por COMPOSIÇÃO, e não por produto: BX-03 e BX-05 são o mesmo
   * bey em caixas diferentes, e contá-lo duas vezes enviesaria a distribuição
   * para as composições que saíram em mais embalagens.
   */
  const contexto = useMemo(() => {
    const beys = composicoes.map((c) => {
      const s = agregar(comboDoCatalogo(c.lancamentos[0]!.anatomy, c.pecas));
      return { pesoTotal: s.weight_g, parcial: s.pesoParcial };
    });
    return derivarContexto(pecas, beys);
  }, [pecas, composicoes]);

  const validade = validar(combo);
  const atributos = agregar(combo);
  const arquetipo = classificar(atributos, contexto, combo.anatomy);
  const parcelas = contribuicoes(combo);
  const max = contexto.maximos[combo.anatomy];
  const semNoInventario = faltaNoInventario(combo, estoque);

  if (loading) return <p style={{ color: T.textMuted }}>Carregando catálogo…</p>;
  if (error) return <p style={{ color: T.danger }}>Erro ao ler o banco: {error}</p>;

  return (
    <section>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Laboratório</h2>
      <p style={{ color: T.textMuted, fontSize: 13, margin: "0 0 16px" }}>
        Monte uma combinação e veja o que esperar dela. O link guarda a montagem.
      </p>

      <div style={{
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {slotsDe(combo.anatomy).map((slot) => (
            <SeletorPeca
              key={slot}
              slot={slot}
              pecas={pecas}
              escolhida={combo.pecas[slot]}
              aoEscolher={(p) => porSlot(slot, p)}
            />
          ))}
        </div>

        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div style={caixa}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{
                background: `${T.accent}22`, color: T.accent, border: `1px solid ${T.accent}`,
                borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
              }}>{arquetipo.rotulo}</span>
              {arquetipo.qualificadores.map((q) => (
                <span key={q} style={{
                  border: `1px solid ${T.border}`, color: T.textSecondary,
                  borderRadius: 999, padding: "3px 11px", fontSize: 12.5,
                }}>{q}</span>
              ))}
            </div>

            {ATRIBUTOS.map(([chave, rotulo, cor]) => {
              const pct = normalizar(atributos[chave], max[chave]);
              return (
                <div key={chave} style={{
                  display: "flex", alignItems: "center", gap: 9, marginBottom: 7,
                }}>
                  <span style={{ width: 88, fontSize: 12.5, color: T.textSecondary }}>
                    {rotulo}
                  </span>
                  <span style={{ flex: 1, height: 7, background: T.bgInput, borderRadius: 4 }}>
                    <span style={{
                      display: "block", height: "100%", width: `${pct}%`,
                      background: cor, borderRadius: 4,
                    }} />
                  </span>
                  <span style={{ width: 66, textAlign: "right", fontSize: 12.5 }}>
                    {atributos[chave]}
                    <span style={{ color: T.textMuted }}> · {pct}%</span>
                  </span>
                </div>
              );
            })}

            <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 10 }}>
              Peso {atributos.weight_g.toFixed(1)} g{atributos.pesoParcial && "*"}
              {" · "}Altura {atributos.height_mm === DESCONHECIDO
                ? "desconhecida" : `${atributos.height_mm} mm`}
              {" · "}Burst {atributos.burst_resistance === DESCONHECIDO
                ? "desconhecido" : atributos.burst_resistance}
            </p>
          </div>

          {validade.estado === "incompleto" && (
            <p style={{ color: T.warn, fontSize: 13, margin: 0 }}>
              Faltam: {validade.faltando.map((s) => ROTULO_SLOT[s]).join(", ")}.
              Os números acima são parciais.
            </p>
          )}

          {/*
            O laboratório serve para planejar o que comprar. O link vai para a
            ficha da peça, que já tem "onde conseguir esta peça" — a busca
            inversa da Onda 1, ordenada do mais fácil para o mais raro. Não há
            tela nova a construir.
          */}
          {usuario && semNoInventario.length > 0 && (
            <div style={{
              background: `${T.warn}12`, border: `1px solid ${T.warn}40`,
              borderRadius: 9, padding: "11px 13px",
            }}>
              <strong style={{ color: T.warn, fontSize: 13 }}>
                {semNoInventario.length === 1
                  ? "Você ainda não tem uma das peças"
                  : `Você ainda não tem ${semNoInventario.length} das peças`}
              </strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: T.textSecondary,
                           fontSize: 13, lineHeight: 1.7 }}>
                {semNoInventario.map((slot) => (
                  <li key={slot}>
                    {ROTULO_SLOT[slot]}{" "}
                    <strong>{combo.pecas[slot]!.name}</strong> —{" "}
                    <Link to={`/peca/${combo.pecas[slot]!.id}`}
                          style={{ color: T.accentDim }}>
                      ver onde conseguir
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parcelas.length > 0 && (
            <div style={caixa}>
              <strong style={{ fontSize: 13 }}>De onde vem cada número</strong>
              {parcelas.map((c) => (
                <div key={c.slot} style={{ marginTop: 9, fontSize: 12.5 }}>
                  <div style={{ color: T.textMuted, fontSize: 11 }}>{ROTULO_SLOT[c.slot]}</div>
                  <div>{c.peca.name}</div>
                  <div style={{ display: "flex", gap: 11, marginTop: 3, fontSize: 11.5 }}>
                    <span style={{ color: COR_TIPO.attack }}>ATQ {c.attack}</span>
                    <span style={{ color: COR_TIPO.defense }}>DEF {c.defense}</span>
                    <span style={{ color: COR_TIPO.stamina }}>RES {c.stamina}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 20, lineHeight: 1.6 }}>
        As barras vão de 0 a 100 sobre o <strong>máximo teórico da anatomia</strong> — a
        melhor peça do catálogo em cada slot, somadas. Os números à esquerda são a soma
        bruta dos atributos das peças, na mesma escala das contribuições ao lado, para que
        as parcelas fechem com o total. Equilibrado é o resultado quando nenhum atributo
        se destaca por 15 pontos.
      </p>
    </section>
  );
}
