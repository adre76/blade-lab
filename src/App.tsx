import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { T } from "./theme.ts";
import { useAuth } from "./hooks/AuthContext.tsx";

function MenuUsuario() {
  const { usuario, perfil, carregando, sair } = useAuth();
  const [aberto, setAberto] = useState(false);

  if (carregando) return null;

  if (!usuario) {
    return (
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Link to="/lab" style={{ color: T.accentDim, fontSize: 13 }}>
          Laboratório
        </Link>
        <Link to="/creditos" style={{ color: T.textMuted, fontSize: 13 }}>
          Fontes e créditos
        </Link>
        <Link
          to="/entrar"
          style={{
            color: T.accent, border: `1px solid ${T.accent}55`,
            background: `${T.accent}14`, borderRadius: 999,
            padding: "5px 14px", fontSize: 13.5, textDecoration: "none",
          }}
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", display: "flex", gap: 14, alignItems: "center" }}>
      <Link to="/lab" style={{ color: T.accentDim, fontSize: 13 }}>
        Laboratório
      </Link>
      <Link to="/creditos" style={{ color: T.textMuted, fontSize: 13 }}>
        Fontes e créditos
      </Link>
      <button
        onClick={() => setAberto((v) => !v)}
        style={{
          background: T.bgCard, border: `1px solid ${T.border}`,
          color: T.textPrimary, borderRadius: 999,
          padding: "5px 14px", fontSize: 13.5, cursor: "pointer",
        }}
      >
        {perfil?.display_name ?? "Conta"} ▾
      </button>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: T.bgCard, border: `1px solid ${T.borderStrong}`,
            borderRadius: 9, padding: 6, minWidth: 170, zIndex: 10,
            display: "grid", gap: 2,
          }}
        >
          {[
            ["/inventario", "Meu inventário"],
            ["/perfil", "Alterar nome"],
          ].map(([para, rotulo]) => (
            <Link
              key={para}
              to={para!}
              style={{
                color: T.textSecondary, textDecoration: "none",
                padding: "8px 11px", borderRadius: 6, fontSize: 13.5,
              }}
            >
              {rotulo}
            </Link>
          ))}
          <button
            onClick={() => void sair()}
            style={{
              background: "transparent", border: "none", color: T.textMuted,
              textAlign: "left", padding: "8px 11px", fontSize: 13.5,
              cursor: "pointer", borderTop: `1px solid ${T.border}`, marginTop: 2,
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: T.bgPage,
        color: T.textPrimary,
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "24px 20px 48px",
      }}
    >
      <header style={{
        maxWidth: 1100, margin: "0 auto 24px",
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", gap: 16, flexWrap: "wrap",
      }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.5 }}>
            Blade X <span style={{ color: T.accent }}>Lab</span>
          </h1>
          <p style={{ margin: "6px 0 0", color: T.textSecondary, fontSize: 15 }}>
            Catálogo de Beyblade X
          </p>
        </Link>
        <MenuUsuario />
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
