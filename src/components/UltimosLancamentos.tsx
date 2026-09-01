import { useMemo } from "react";
import { Link } from "react-router-dom";
import { T } from "../theme.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { urlImagem } from "../lib/imagens.ts";

/**
 * Os últimos produtos por data de lançamento.
 *
 * Sai do catálogo que a página já carrega — nenhuma consulta a mais, nenhuma
 * infraestrutura de notícias. Foi para viabilizar este bloco que as datas de
 * lançamento foram completadas de 13 para 154 dos 159 beys.
 *
 * Bey sem data fica de fora: sem data não há como ordenar, e inventar uma
 * colocaria um produto antigo no topo.
 */
export default function UltimosLancamentos({ limite = 6 }: { limite?: number }) {
  const { composicoes, loading } = useCatalog();

  const recentes = useMemo(() => {
    return composicoes
      .map((c) => ({
        comp: c,
        bey: [...c.lancamentos]
          .filter((l) => l.release_date)
          .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))[0],
      }))
      .filter((x): x is { comp: (typeof composicoes)[number]; bey: NonNullable<typeof x.bey> } =>
        Boolean(x.bey))
      .sort((a, b) => (b.bey.release_date ?? "").localeCompare(a.bey.release_date ?? ""))
      .slice(0, limite);
  }, [composicoes, limite]);

  if (loading || !recentes.length) return null;

  return (
    <div style={{
      display: "grid", gap: 10,
      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    }}>
      {recentes.map(({ comp, bey }) => {
        const arte = urlImagem(bey.image_path);
        return (
          <Link key={comp.chave} to={`/bey/${bey.id}`} style={{
            textDecoration: "none", color: "inherit",
            background: T.bgCard, border: `1px solid ${T.border}`,
            borderRadius: 9, overflow: "hidden",
          }}>
            <div style={{
              aspectRatio: "16 / 9",
              // Fundo claro, pelo mesmo motivo do card do catálogo: as artes
              // de produto foram desenhadas para fundo branco.
              background: "linear-gradient(140deg, #ffffff, #e8ecf1 70%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {arte && (
                <img src={arte} alt={comp.nome} loading="lazy"
                     style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              )}
            </div>
            <div style={{ padding: "8px 10px 10px" }}>
              <div style={{ color: T.textMuted, fontSize: 11 }}>
                {bey.release_code} · {bey.release_date?.slice(0, 7)}
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{comp.nome}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
