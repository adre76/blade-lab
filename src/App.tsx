import { T } from "./theme.ts";
import { useAnatomies } from "./hooks/useAnatomies.ts";

const ROTULO: Record<string, string> = {
  basic: "BX — Basic Line",
  unique: "UX — Unique Line",
  custom: "CX — Custom Line",
  custom_expand: "CX — Expand Blade",
};

export default function App() {
  const { ordenadas, error, loading } = useAnatomies();

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
      <header style={{ maxWidth: 720, margin: "0 auto 28px" }}>
        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.5 }}>
          Blade X <span style={{ color: T.accent }}>Lab</span>
        </h1>
        <p style={{ margin: "6px 0 0", color: T.textSecondary, fontSize: 15 }}>
          Catálogo e laboratório de Beyblade X · Onda 0 — fundação
        </p>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto" }}>
        {loading && <p style={{ color: T.textMuted }}>Carregando anatomias…</p>}

        {error && (
          <p style={{ color: T.danger, background: T.bgCard, padding: 16, borderRadius: 8 }}>
            Erro ao ler o banco: {error}
          </p>
        )}

        {!loading && !error && ordenadas.length === 0 && (
          <p style={{ color: T.warn }}>
            Conectou ao banco, mas <code>anatomy_slots</code> está vazia.
          </p>
        )}

        {ordenadas.map(([anatomy, slots]) => (
          <section
            key={anatomy}
            style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              <strong style={{ fontSize: 15 }}>{ROTULO[anatomy] ?? anatomy}</strong>
              <span style={{ color: T.accentWarm, fontSize: 13, whiteSpace: "nowrap" }}>
                {slots.length} peças
              </span>
            </div>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {slots.map((slot) => (
                <span
                  key={slot}
                  style={{
                    background: T.bgInput,
                    border: `1px solid ${T.border}`,
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 12.5,
                    color: T.textSecondary,
                  }}
                >
                  {slot}
                </span>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
