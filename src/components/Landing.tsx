import { Link, Navigate, useLocation } from "react-router-dom";
import { T } from "../theme.ts";
import { destinoDaRaiz } from "../lib/rotas.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { PERGUNTAS } from "../lib/faq.ts";
import UltimosLancamentos from "./UltimosLancamentos.tsx";

/**
 * Três perguntas escolhidas para quem chega sem saber nada.
 *
 * Guarda ids, e o `.find` devolve nulo quando um id não existe: se uma
 * pergunta for renomeada, o bloco encolhe em vez de quebrar a página.
 */
const PRIMEIRAS = ["quantas-pecas", "por-que-ataque-ou-defesa", "regras-da-batalha"];

function Caminho({ para, titulo, detalhe }: {
  para: string; titulo: string; detalhe: string;
}) {
  return (
    <Link to={para} style={{
      textDecoration: "none", color: "inherit",
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "15px 17px", display: "block",
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.accent }}>{titulo}</div>
      <div style={{ color: T.textSecondary, fontSize: 13.5, marginTop: 4 }}>{detalhe}</div>
    </Link>
  );
}

export default function Landing() {
  const { search } = useLocation();
  const destino = destinoDaRaiz(search);
  const { composicoes, pecas, totalProdutos } = useCatalog();

  // Antes de qualquer outra coisa: link antigo vai para onde foi feito para ir.
  if (destino) return <Navigate to={destino} replace />;

  return (
    <section>
      <p style={{ color: T.textSecondary, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" }}>
        Todo Beyblade X que saiu, peça por peça — e um laboratório para você montar
        combinações e ver o que esperar delas <strong>antes</strong> de comprar.
      </p>

      <div style={{
        display: "grid", gap: 12, marginBottom: 28,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}>
        {/*
          "peças diferentes", e não "peças": `pecas` conta as que aparecem em
          algum produto, e o catálogo tem outras que nenhum bey Takara Tomy usa
          ainda. Dizer só "peças" daria um número que não bate com o do seed.
        */}
        <Caminho para="/catalogo" titulo="Catálogo"
                 detalhe={totalProdutos
                   ? `${totalProdutos} produtos, ${pecas.length} peças diferentes`
                   : "Todos os beys, peça por peça"} />
        <Caminho para="/lab" titulo="Laboratório"
                 detalhe="Monte e veja o resultado antes de comprar" />
        <Caminho para="/faq" titulo="Entender o jogo"
                 detalhe={`O básico em ${PERGUNTAS.length} perguntas`} />
      </div>

      {composicoes.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>O que saiu recentemente</h3>
          <UltimosLancamentos limite={6} />
        </div>
      )}

      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Comece por aqui</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {PRIMEIRAS.map((id) => {
            const p = PERGUNTAS.find((x) => x.id === id);
            return p ? (
              <Link key={id} to={`/faq#${id}`} style={{
                textDecoration: "none", color: T.textSecondary, fontSize: 14,
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: 9, padding: "11px 14px",
              }}>{p.pergunta}</Link>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}
