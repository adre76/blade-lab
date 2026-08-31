import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { T } from "../theme.ts";
import { useAuth } from "../hooks/AuthContext.tsx";

export default function Perfil() {
  const { perfil, carregando, atualizarNome } = useAuth();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  useEffect(() => {
    if (perfil) setNome(perfil.display_name);
  }, [perfil]);

  if (carregando) return <p style={{ color: T.textMuted }}>Carregando…</p>;
  if (!perfil) {
    return (
      <div>
        <p style={{ color: T.textSecondary }}>Você não está autenticado.</p>
        <Link to="/entrar" style={{ color: T.accent }}>Entrar</Link>
      </div>
    );
  }

  const salvar = async () => {
    setSalvando(true);
    setMensagem(null);
    const { erro } = await atualizarNome(nome);
    setMensagem(erro ? { texto: erro, erro: true } : { texto: "Nome atualizado.", erro: false });
    setSalvando(false);
  };

  const alterado = nome.trim() !== perfil.display_name && nome.trim() !== "";

  return (
    <div style={{ maxWidth: 460 }}>
      <Link to="/" style={{ color: T.textMuted, fontSize: 13 }}>← catálogo</Link>
      <h2 style={{ margin: "14px 0 6px", fontSize: 24 }}>Seu perfil</h2>
      <p style={{ color: T.textSecondary, fontSize: 14, margin: "0 0 18px", lineHeight: 1.6 }}>
        O nome veio da sua conta Google. Você pode trocá-lo — é o que aparece
        quando compartilha um combo.
      </p>

      <label style={{ display: "block", color: T.textMuted, fontSize: 12.5, marginBottom: 6 }}>
        Nome de exibição
      </label>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={60}
        style={{
          width: "100%", boxSizing: "border-box",
          background: T.bgInput, color: T.textPrimary,
          border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "10px 12px", fontSize: 15, outline: "none",
        }}
      />

      <button
        onClick={() => void salvar()}
        disabled={!alterado || salvando}
        style={{
          marginTop: 12,
          background: alterado ? T.accent : T.bgCard,
          color: alterado ? T.textOnAccent : T.textMuted,
          border: `1px solid ${alterado ? T.accent : T.border}`,
          borderRadius: 8, padding: "9px 18px", fontSize: 14,
          cursor: alterado && !salvando ? "pointer" : "default",
          fontWeight: 500,
        }}
      >
        {salvando ? "Salvando…" : "Salvar"}
      </button>

      {mensagem && (
        <p style={{
          marginTop: 12, fontSize: 13.5,
          color: mensagem.erro ? T.danger : T.ok,
        }}>
          {mensagem.texto}
        </p>
      )}
    </div>
  );
}
