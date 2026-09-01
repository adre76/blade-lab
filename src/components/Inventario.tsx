import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { T } from "../theme.ts";
import { useAuth } from "../hooks/AuthContext.tsx";
import { useInventario } from "../hooks/InventarioContext.tsx";
import { useEstoquePecas } from "../hooks/useEstoquePecas.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { ROTULO_SLOT } from "./rotulos.ts";
import ControleInventario from "./ControleInventario.tsx";
import type { Database } from "../types/database.ts";

type PartSlot = Database["public"]["Enums"]["part_slot"];

/** Estoque de peças derivado do inventário de beys (view `user_parts`). */
type PecaEmEstoque = { part_id: string; slot: PartSlot; quantity: number; nome: string };

export default function Inventario() {
  const { usuario, carregando: carregandoAuth } = useAuth();
  const { itens, carregando } = useInventario();
  const { composicoes } = useCatalog();
  const { linhas: estoqueBruto } = useEstoquePecas();

  // Índice bey -> composição, para exibir nome e peças sem consultar de novo.
  const porBey = useMemo(() => {
    const m = new Map<string, (typeof composicoes)[number]>();
    for (const c of composicoes) for (const l of c.lancamentos) m.set(l.id, c);
    return m;
  }, [composicoes]);

  // Índice part_id -> nome, montado do catálogo que a página já carregou.
  const nomePorPeca = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of composicoes) for (const p of c.pecas) m.set(p.part.id, p.part.name);
    return m;
  }, [composicoes]);

  // O estoque vem do hook; o NOME de cada peça vem do catálogo que esta página
  // já carregou, e não de um embedding — a view não declara chave estrangeira.
  const estoque: PecaEmEstoque[] = useMemo(
    () => estoqueBruto.flatMap((r) => {
      const nome = nomePorPeca.get(r.part_id);
      return nome ? [{ ...r, nome }] : [];
    }),
    [estoqueBruto, nomePorPeca],
  );

  if (carregandoAuth) return <p style={{ color: T.textMuted }}>Carregando…</p>;
  if (!usuario) return <Navigate to="/entrar" state={{ de: "/inventario" }} replace />;

  const possuidos = itens.filter((i) => i.status === "owned");
  const desejados = itens.filter((i) => i.status === "wishlist");

  const secao = (titulo: string, lista: typeof itens, vazio: string) => (
    <section style={{ marginBottom: 26 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>
        {titulo}{" "}
        <span style={{ color: T.textMuted, fontWeight: 400, fontSize: 14 }}>
          ({lista.length})
        </span>
      </h3>

      {lista.length === 0 ? (
        <p style={{ color: T.textMuted, fontSize: 13.5 }}>{vazio}</p>
      ) : (
        <div style={{
          display: "grid", gap: 9,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        }}>
          {lista.map((item) => {
            const comp = porBey.get(item.beyblade_id);
            return (
              <div key={item.id} style={{
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: 9, padding: "11px 13px",
              }}>
                <Link to={`/bey/${item.beyblade_id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                    {comp?.nome ?? "—"}
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 2 }}>
                    {comp?.pecas.map((p) => p.part.name).join(" · ")}
                  </div>
                </Link>
                <div style={{ marginTop: 9 }}>
                  <ControleInventario beybladeId={item.beyblade_id} compacto />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const porSlot = estoque.reduce<Record<string, PecaEmEstoque[]>>((acc, p) => {
    (acc[p.slot] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <Link to="/" style={{ color: T.textMuted, fontSize: 13 }}>← catálogo</Link>
      <h2 style={{ margin: "14px 0 20px", fontSize: 24 }}>Meu inventário</h2>

      {carregando && <p style={{ color: T.textMuted }}>Carregando…</p>}

      {secao("Tenho", possuidos,
        "Nada marcado ainda. No catálogo, use o botão \"Tenho\" nos beys da sua coleção.")}
      {secao("Quero", desejados,
        "Nada na lista de desejos.")}

      {estoque.length > 0 && (
        <section>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Peças disponíveis</h3>
          <p style={{ color: T.textMuted, fontSize: 12.5, margin: "0 0 12px", lineHeight: 1.6 }}>
            Derivado do que você possui: cada bey entrega suas peças. É com este
            estoque que o laboratório vai montar combinações.
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {Object.entries(porSlot).map(([slot, pecas]) => (
              <div key={slot}>
                <div style={{ color: T.textMuted, fontSize: 11.5, marginBottom: 5 }}>
                  {ROTULO_SLOT[slot as PartSlot] ?? slot}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pecas.map((p) => (
                    <Link key={p.part_id} to={`/peca/${p.part_id}`} style={{
                      background: T.bgInput, border: `1px solid ${T.border}`,
                      borderRadius: 6, padding: "4px 9px", fontSize: 12.5,
                      color: T.textSecondary, textDecoration: "none",
                    }}>
                      {p.nome}
                      {p.quantity > 1 && (
                        <span style={{ color: T.accent, marginLeft: 5 }}>×{p.quantity}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
