import { useMemo, useState } from "react";
import { T } from "../theme.ts";
import { useCatalog, somaBruta, type BeyCompleto } from "../hooks/useCatalog.ts";
import type { Database } from "../types/database.ts";

type BeyType = Database["public"]["Enums"]["bey_type"];
type Rarity = Database["public"]["Enums"]["rarity"];

const COR_TIPO: Record<BeyType, string> = {
  attack: T.typeAttack,
  defense: T.typeDefense,
  stamina: T.typeStamina,
  balance: T.typeBalance,
};

const ROTULO_TIPO: Record<BeyType, string> = {
  attack: "Ataque",
  defense: "Defesa",
  stamina: "Stamina",
  balance: "Equilíbrio",
};

const ROTULO_RARIDADE: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  very_rare: "Muito raro",
  exclusive: "Exclusivo",
};

const ROTULO_SLOT: Record<string, string> = {
  blade: "Lâmina",
  ratchet: "Ratchet",
  bit: "Bit",
  lock_chip: "Lock Chip",
  main_blade: "Main Blade",
  metal_blade: "Metal Blade",
  over_blade: "Over Blade",
  assist_blade: "Assist Blade",
};

const ROTULO_LANCAMENTO: Record<string, string> = {
  starter: "Starter",
  booster: "Booster",
  random_booster: "Random Booster",
  deck_set: "Deck Set",
  custom_set: "Custom Set",
  limited: "Limitado",
  event_exclusive: "Exclusivo de evento",
  other: "Outro",
};

/** Barra de atributo. A escala é bruta (§5.3); a normalização é da onda 3. */
function Barra({ rotulo, valor, max, cor }: {
  rotulo: string; valor: number; max: number; cor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      <span style={{ color: T.textMuted, width: 58, flexShrink: 0 }}>{rotulo}</span>
      <div style={{
        flex: 1, height: 6, background: T.bgInput, borderRadius: 3, overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.min(100, (valor / max) * 100)}%`,
          height: "100%", background: cor, borderRadius: 3,
        }} />
      </div>
      <span style={{ color: T.textSecondary, width: 26, textAlign: "right", flexShrink: 0 }}>
        {valor}
      </span>
    </div>
  );
}

function Card({ bey, maxAtributo }: { bey: BeyCompleto; maxAtributo: number }) {
  const soma = somaBruta(bey);
  const cor = bey.bey_type ? COR_TIPO[bey.bey_type] : T.textMuted;

  return (
    <article style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${cor}`,
      borderRadius: 10,
      padding: "14px 16px",
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: T.textMuted, fontSize: 11.5, letterSpacing: 0.4 }}>
            {bey.release_code}
            {bey.release_date && ` · ${new Date(bey.release_date).getFullYear()}`}
          </div>
          <h3 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 600 }}>{bey.name}</h3>
        </div>
        {bey.bey_type && (
          <span style={{
            color: cor, border: `1px solid ${cor}55`, background: `${cor}18`,
            borderRadius: 999, padding: "2px 9px", fontSize: 11.5, whiteSpace: "nowrap",
          }}>
            {ROTULO_TIPO[bey.bey_type]}
          </span>
        )}
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 12px" }}>
        {bey.pecas.map(({ slot, part }) => (
          <span key={slot} title={ROTULO_SLOT[slot] ?? slot} style={{
            background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6,
            padding: "3px 8px", fontSize: 12, color: T.textSecondary,
          }}>
            <span style={{ color: T.textMuted, fontSize: 10.5 }}>{ROTULO_SLOT[slot] ?? slot}</span>
            {"  "}
            {part.name}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <Barra rotulo="Ataque" valor={soma.attack} max={maxAtributo} cor={T.typeAttack} />
        <Barra rotulo="Defesa" valor={soma.defense} max={maxAtributo} cor={T.typeDefense} />
        <Barra rotulo="Stamina" valor={soma.stamina} max={maxAtributo} cor={T.typeStamina} />
      </div>

      <footer style={{
        marginTop: 10, paddingTop: 9, borderTop: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.textMuted,
      }}>
        <span>{ROTULO_LANCAMENTO[bey.release_type] ?? bey.release_type}</span>
        <span>
          {soma.weight_g.toFixed(1)} g{soma.pesoParcial && "*"}
          {" · "}
          <span style={{ color: bey.rarity === "common" ? T.textMuted : T.accentWarm }}>
            {ROTULO_RARIDADE[bey.rarity]}
          </span>
        </span>
      </footer>
    </article>
  );
}

export default function Catalogo() {
  const { beys, error, loading } = useCatalog();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<BeyType | "todos">("todos");

  // Escala das barras: o maior atributo somado entre os beys carregados.
  // É provisória de propósito — o denominador definitivo (§5.4) é o máximo
  // teórico por anatomia, e nasce com o motor na onda 3.
  const maxAtributo = useMemo(() => {
    const valores = beys.flatMap((b) => {
      const s = somaBruta(b);
      return [s.attack, s.defense, s.stamina];
    });
    return Math.max(100, ...valores);
  }, [beys]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return beys.filter((b) => {
      if (tipo !== "todos" && b.bey_type !== tipo) return false;
      if (!termo) return true;
      const alvo = `${b.release_code} ${b.name} ${b.pecas.map((p) => p.part.name).join(" ")}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [beys, busca, tipo]);

  const estiloFiltro = (ativo: boolean, cor: string) => ({
    background: ativo ? `${cor}22` : T.bgCard,
    border: `1px solid ${ativo ? cor : T.border}`,
    color: ativo ? cor : T.textSecondary,
    borderRadius: 999,
    padding: "5px 13px",
    fontSize: 13,
    cursor: "pointer",
  });

  return (
    <section>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, código ou peça…"
          style={{
            flex: "1 1 240px", background: T.bgInput, color: T.textPrimary,
            border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "9px 12px", fontSize: 14, outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
        <button onClick={() => setTipo("todos")} style={estiloFiltro(tipo === "todos", T.accent)}>
          Todos
        </button>
        {(Object.keys(ROTULO_TIPO) as BeyType[]).map((t) => (
          <button key={t} onClick={() => setTipo(t)} style={estiloFiltro(tipo === t, COR_TIPO[t])}>
            {ROTULO_TIPO[t]}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: T.textMuted }}>Carregando catálogo…</p>}

      {error && (
        <p style={{ color: T.danger, background: T.bgCard, padding: 16, borderRadius: 8 }}>
          Erro ao ler o banco: {error}
        </p>
      )}

      {!loading && !error && (
        <p style={{ color: T.textMuted, fontSize: 13, margin: "0 0 12px" }}>
          {filtrados.length} de {beys.length} beyblades
        </p>
      )}

      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      }}>
        {filtrados.map((bey) => (
          <Card key={bey.id} bey={bey} maxAtributo={maxAtributo} />
        ))}
      </div>

      {!loading && !error && filtrados.length === 0 && beys.length > 0 && (
        <p style={{ color: T.textMuted }}>Nada encontrado para esse filtro.</p>
      )}

      <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 24, lineHeight: 1.6 }}>
        Piloto da Onda 1 — 11 beys da Basic Line. Os atributos são a soma bruta das peças;
        a normalização, o arquétipo e a contribuição por peça entram com o motor na Onda 3.
        <br />
        Dados medidos pela comunidade em{" "}
        <a href="https://byybladebuilder.com/parts" style={{ color: T.accentDim }}>byybladebuilder</a>{" "}
        e{" "}
        <a href="https://beyblade.wiki/beyblade-x-list/" style={{ color: T.accentDim }}>beyblade.wiki</a>,
        não folha oficial da Takara Tomy. <span title="peso parcial">*</span> = alguma peça sem peso registrado.
      </p>
    </section>
  );
}
