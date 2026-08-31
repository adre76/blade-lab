import { useMemo, useState } from "react";
import { T } from "../theme.ts";
import { useCatalog, somaBruta, type Composicao } from "../hooks/useCatalog.ts";
import type { Database } from "../types/database.ts";

type BeyType = Database["public"]["Enums"]["bey_type"];
type Rarity = Database["public"]["Enums"]["rarity"];
type Brand = Database["public"]["Enums"]["brand"];

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

const MARCA: Record<Brand, { rotulo: string; cor: string }> = {
  takara_tomy: { rotulo: "Takara Tomy", cor: T.accentDim },
  hasbro: { rotulo: "Hasbro", cor: T.accentWarm },
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
      <div style={{ flex: 1, height: 6, background: T.bgInput, borderRadius: 3, overflow: "hidden" }}>
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

function Etiqueta({ texto, cor, forte = false }: { texto: string; cor: string; forte?: boolean }) {
  return (
    <span style={{
      color: cor,
      border: `1px solid ${cor}${forte ? "77" : "44"}`,
      background: `${cor}${forte ? "1f" : "14"}`,
      borderRadius: 999,
      padding: "2px 9px",
      fontSize: 11.5,
      whiteSpace: "nowrap",
    }}>
      {texto}
    </span>
  );
}

function Card({ comp, maxAtributo }: { comp: Composicao; maxAtributo: number }) {
  const soma = somaBruta(comp.pecas);
  const principal = comp.lancamentos[0];
  if (!principal) return null;

  const cor = principal.bey_type ? COR_TIPO[principal.bey_type] : T.textMuted;
  const marca = MARCA[principal.brand];
  const anos = [...new Set(
    comp.lancamentos.map((l) => l.release_date?.slice(0, 4)).filter(Boolean),
  )];
  const tiposLancamento = [...new Set(
    comp.lancamentos.map((l) => ROTULO_LANCAMENTO[l.release_type] ?? l.release_type),
  )];

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
            {comp.lancamentos.map((l) => l.release_code).join(" · ")}
            {anos.length > 0 && ` · ${anos.join("/")}`}
          </div>
          <h3 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 600 }}>{comp.nome}</h3>
        </div>
        {principal.bey_type && (
          <Etiqueta texto={ROTULO_TIPO[principal.bey_type]} cor={cor} forte />
        )}
      </header>

      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <Etiqueta texto={marca.rotulo} cor={marca.cor} />
        {comp.lancamentos.length > 1 && (
          <Etiqueta
            texto={`${comp.lancamentos.length} versões`}
            cor={T.textMuted}
          />
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 12px" }}>
        {comp.pecas.map(({ slot, part }) => (
          <span key={slot} style={{
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
        display: "flex", justifyContent: "space-between", gap: 10,
        fontSize: 11.5, color: T.textMuted,
      }}>
        <span>{tiposLancamento.join(" · ")}</span>
        <span style={{ whiteSpace: "nowrap" }}>
          {soma.weight_g.toFixed(1)} g{soma.pesoParcial && "*"}
          {" · "}
          <span style={{ color: comp.raridade === "common" ? T.textMuted : T.accentWarm }}>
            {ROTULO_RARIDADE[comp.raridade]}
          </span>
        </span>
      </footer>
    </article>
  );
}

export default function Catalogo() {
  const { composicoes, totalProdutos, error, loading } = useCatalog();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<BeyType | "todos">("todos");

  // Escala das barras: a maior soma entre as composições carregadas.
  // Provisória de propósito — o denominador definitivo (§5.4) é o máximo
  // teórico por anatomia, e nasce com o motor na onda 3.
  const maxAtributo = useMemo(() => {
    const valores = composicoes.flatMap((c) => {
      const s = somaBruta(c.pecas);
      return [s.attack, s.defense, s.stamina];
    });
    return Math.max(100, ...valores);
  }, [composicoes]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return composicoes.filter((c) => {
      if (tipo !== "todos" && c.lancamentos[0]?.bey_type !== tipo) return false;
      if (!termo) return true;
      const alvo = [
        c.nome,
        ...c.lancamentos.map((l) => l.release_code),
        ...c.pecas.map((p) => p.part.name),
        MARCA[c.lancamentos[0]!.brand].rotulo,
      ].join(" ");
      return alvo.toLowerCase().includes(termo);
    });
  }, [composicoes, busca, tipo]);

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
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome, código, peça ou marca…"
        style={{
          width: "100%", boxSizing: "border-box",
          background: T.bgInput, color: T.textPrimary,
          border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "9px 12px", fontSize: 14, outline: "none", marginBottom: 12,
        }}
      />

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
          {filtradas.length} de {composicoes.length} composições
          {totalProdutos > composicoes.length && ` · ${totalProdutos} produtos lançados`}
        </p>
      )}

      <div style={{
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      }}>
        {filtradas.map((comp) => (
          <Card key={comp.chave} comp={comp} maxAtributo={maxAtributo} />
        ))}
      </div>

      {!loading && !error && filtradas.length === 0 && composicoes.length > 0 && (
        <p style={{ color: T.textMuted }}>Nada encontrado para esse filtro.</p>
      )}

      <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 24, lineHeight: 1.6 }}>
        Piloto da Onda 1 — Basic Line. Produtos com a mesma composição aparecem num
        card só: BX-03 e BX-05 são o mesmo Wizard Arrow, mudando só a caixa.
        Os atributos são a soma bruta das peças; a normalização, o arquétipo e a
        contribuição por peça entram com o motor na Onda 3.
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
