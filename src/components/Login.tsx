import { Navigate, useLocation } from "react-router-dom";
import { T } from "../theme.ts";
import { useAuth } from "../hooks/AuthContext.tsx";

/** Ícone do Google, nas cores oficiais. Inline para não depender de rede. */
function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.9 6.2C12.3 13.4 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.5-4.1 7-10.2 7-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.7-3.9-13.6-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function Login() {
  const { usuario, carregando, entrarComGoogle, erro } = useAuth();
  const local = useLocation();

  // Já autenticado: volta para onde queria ir, ou para o catálogo.
  if (!carregando && usuario) {
    const destino = (local.state as { de?: string } | null)?.de ?? "/";
    return <Navigate to={destino} replace />;
  }

  return (
    <div style={{ maxWidth: 420, margin: "20px auto 0" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>Entrar</h2>
      <p style={{ color: T.textSecondary, fontSize: 14.5, lineHeight: 1.65, margin: "0 0 20px" }}>
        Com uma conta você registra os beyblades que possui e os que quer, e o
        catálogo passa a mostrar o que já está na sua coleção.
      </p>

      <button
        onClick={() => void entrarComGoogle()}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 10,
          background: "#ffffff", color: "#1f1f1f",
          border: "none", borderRadius: 8,
          padding: "12px 16px", fontSize: 15, fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <IconeGoogle />
        Continuar com Google
      </button>

      {erro && (
        <p style={{
          marginTop: 14, color: T.warn, fontSize: 13.5, lineHeight: 1.6,
          background: `${T.warn}12`, border: `1px solid ${T.warn}40`,
          borderRadius: 9, padding: "11px 13px",
        }}>
          {erro}
        </p>
      )}

      <p style={{ color: T.textMuted, fontSize: 12.5, lineHeight: 1.65, marginTop: 20 }}>
        O catálogo continua aberto sem conta — entrar só acrescenta o inventário
        pessoal. Guardamos apenas seu nome de exibição e o que você marcar como
        seu.
      </p>
    </div>
  );
}
