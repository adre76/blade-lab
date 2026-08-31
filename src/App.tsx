import { Link, Outlet } from "react-router-dom";
import { T } from "./theme.ts";

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
        <Link to="/creditos" style={{ color: T.textMuted, fontSize: 13 }}>
          Fontes e créditos
        </Link>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
