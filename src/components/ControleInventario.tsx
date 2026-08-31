import { useNavigate } from "react-router-dom";
import { T } from "../theme.ts";
import { useAuth } from "../hooks/AuthContext.tsx";
import { useInventario } from "../hooks/InventarioContext.tsx";
import type { EstadoInventario } from "../lib/inventario.ts";

/**
 * Controle de posse de um bey: nenhum / tenho / quero.
 *
 * Um controle de três estados, e não dois botões independentes, porque no banco
 * são o MESMO registro: `unique (profile_id, beyblade_id)` torna posse e desejo
 * mutuamente exclusivos. Dois botões sugeririam que dá para ter os dois.
 *
 * Para o visitante anônimo o controle aparece e leva ao login — some-lo
 * esconderia a funcionalidade de quem ainda não sabe que ela existe.
 */
export default function ControleInventario({
  beybladeId,
  compacto = false,
}: {
  beybladeId: string;
  compacto?: boolean;
}) {
  const { usuario } = useAuth();
  const { estado, quantidade, definir } = useInventario();
  const navegar = useNavigate();

  const atual = usuario ? estado(beybladeId) : "nenhum";
  const qtd = usuario ? quantidade(beybladeId) : 0;

  /**
   * O card inteiro é um <Link> para o detalhe do bey. Sem parar o evento aqui,
   * marcar "tenho" navegaria para outra página no mesmo clique.
   */
  const parar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const acionar = (e: React.MouseEvent, alvo: EstadoInventario) => {
    parar(e);
    if (!usuario) {
      navegar("/entrar", { state: { de: window.location.pathname } });
      return;
    }
    // Clicar no estado já ativo desmarca — é o gesto esperado num controle
    // de seleção única.
    void definir(beybladeId, atual === alvo ? "nenhum" : alvo, qtd || 1);
  };

  const botao = (alvo: Exclude<EstadoInventario, "nenhum">, rotulo: string, cor: string) => {
    const ativo = atual === alvo;
    return (
      <button
        onClick={(e) => acionar(e, alvo)}
        title={usuario ? undefined : "Entre para registrar sua coleção"}
        style={{
          background: ativo ? `${cor}26` : "transparent",
          border: `1px solid ${ativo ? cor : T.border}`,
          color: ativo ? cor : T.textMuted,
          borderRadius: 999,
          padding: compacto ? "3px 10px" : "5px 13px",
          fontSize: compacto ? 11.5 : 13,
          cursor: "pointer",
          fontWeight: ativo ? 600 : 400,
        }}
      >
        {rotulo}
      </button>
    );
  };

  const ajustar = (e: React.MouseEvent, delta: number) => {
    parar(e);
    const nova = qtd + delta;
    if (nova < 1) {
      void definir(beybladeId, "nenhum");
      return;
    }
    void definir(beybladeId, "owned", nova);
  };

  const estiloAjuste = {
    background: "transparent",
    border: `1px solid ${T.border}`,
    color: T.textSecondary,
    borderRadius: 6,
    width: 22,
    height: 22,
    lineHeight: 1,
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {botao("owned", "Tenho", T.ok)}
      {botao("wishlist", "Quero", T.accentWarm)}

      {/* Quantidade só em `owned`: o check do banco recusa mais que 1 na
          wishlist, e a interface não deve oferecer o que o banco recusa. */}
      {atual === "owned" && (
        <span
          onClick={parar}
          style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 2 }}
        >
          <button onClick={(e) => ajustar(e, -1)} style={estiloAjuste} aria-label="Diminuir">−</button>
          <span style={{ color: T.textSecondary, fontSize: 12.5, minWidth: 14, textAlign: "center" }}>
            {qtd}
          </span>
          <button onClick={(e) => ajustar(e, +1)} style={estiloAjuste} aria-label="Aumentar">+</button>
        </span>
      )}
    </div>
  );
}
