import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { T } from "../theme.ts";
import { PERGUNTAS, GRUPOS, ROTULO_GRUPO } from "../lib/faq.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { DistribuicaoPorTipo, DistribuicaoPorRaridade } from "./NumerosDoCatalogo.tsx";
import type { Pergunta } from "../lib/faq.ts";

/**
 * Respostas que embutem um número calculado, e qual.
 *
 * O mapa é por id, e não um campo no JSON, porque o que se embute é um
 * componente — o arquivo de conteúdo não deve saber que React existe.
 */
const EMBUTE: Record<string, ComponentType> = {
  "o-que-esperar-de-cada-tipo": DistribuicaoPorTipo,
  "o-que-e-raro": DistribuicaoPorRaridade,
};

/** O que a tela credita ao pé da resposta. `dados` não credita: é nosso. */
const CREDITO: Record<Pergunta["origem"], string | null> = {
  dados: null,
  wiki: "Descrição oficial",
  jogador: "Experiência de quem joga",
};

function Resposta({ p }: { p: Pergunta }) {
  const { composicoes, pecas } = useCatalog();

  const idDaPeca = (nome: string) => pecas.find((x) => x.name === nome)?.id;
  const idDoBey = (codigo: string) =>
    composicoes.flatMap((c) => c.lancamentos).find((b) => b.release_code === codigo)?.id;

  const Extra = EMBUTE[p.id];
  const credito = CREDITO[p.origem];

  const atalho = {
    background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6,
    padding: "3px 9px", fontSize: 12.5, color: T.accentDim, textDecoration: "none",
  };

  return (
    <article id={p.id} style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "15px 17px", marginBottom: 12,
      scrollMarginTop: 16,
    }}>
      <h3 style={{ margin: "0 0 9px", fontSize: 16 }}>{p.pergunta}</h3>

      {p.resposta.split("\n\n").map((par, i) => (
        <p key={i} style={{
          margin: "0 0 9px", color: T.textSecondary, fontSize: 14, lineHeight: 1.65,
        }}>{par}</p>
      ))}

      {Extra && <Extra />}

      {(p.cita_pecas.length > 0 || p.cita_beys.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {p.cita_pecas.map((nome) => {
            const id = idDaPeca(nome);
            return id ? <Link key={nome} to={`/peca/${id}`} style={atalho}>{nome}</Link> : null;
          })}
          {p.cita_beys.map((codigo) => {
            const id = idDoBey(codigo);
            return id ? <Link key={codigo} to={`/bey/${id}`} style={atalho}>{codigo}</Link> : null;
          })}
        </div>
      )}

      {(credito || p.fonte) && (
        <p style={{ color: T.textMuted, fontSize: 11.5, margin: "10px 0 0" }}>
          {credito}
          {p.fonte && (
            <>
              {credito && " · "}
              <a href={p.fonte} style={{ color: T.accentDim }}>fonte</a>
            </>
          )}
        </p>
      )}
    </article>
  );
}

export default function Faq() {
  return (
    <section>
      <h2 style={{ margin: "0 0 4px", fontSize: 22 }}>Entender o jogo</h2>
      <p style={{ color: T.textMuted, fontSize: 13.5, margin: "0 0 20px" }}>
        O básico de Beyblade X, em {PERGUNTAS.length} perguntas.
      </p>

      {GRUPOS.map((g) => {
        const doGrupo = PERGUNTAS.filter((p) => p.grupo === g);
        if (!doGrupo.length) return null;
        return (
          <div key={g} style={{ marginBottom: 24 }}>
            <h3 style={{
              margin: "0 0 10px", fontSize: 13, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: 0.6,
            }}>{ROTULO_GRUPO[g]}</h3>
            {doGrupo.map((p) => <Resposta key={p.id} p={p} />)}
          </div>
        );
      })}
    </section>
  );
}
