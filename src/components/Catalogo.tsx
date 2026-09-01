import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { T } from "../theme.ts";
import { useCatalog, somaBruta } from "../hooks/useCatalog.ts";
import BeyCard from "./BeyCard.tsx";
import {
  COR_TIPO, ROTULO_TIPO, ROTULO_RARIDADE, COR_RARIDADE, BUSCA_SLOT, MARCA,
} from "./rotulos.ts";
import { casaTermos, termosDaBusca } from "../lib/busca.ts";
import type { Database } from "../types/database.ts";

type BeyType = Database["public"]["Enums"]["bey_type"];

const TIPOS = Object.keys(ROTULO_TIPO) as BeyType[];

/**
 * Filtros de raridade.
 *
 * `dificil` existe além dos degraus porque é o que a pergunta costuma ser —
 * "o que aqui não se compra na prateleira" —, e responder isso exigiria clicar
 * nos quatro degraus um a um. Os degraus continuam disponíveis para quem quer
 * isolar um deles.
 */
const RARIDADES = ["dificil", "uncommon", "rare", "very_rare", "exclusive"] as const;
type FiltroRaridade = (typeof RARIDADES)[number];

const ROTULO_FILTRO_RARIDADE: Record<FiltroRaridade, string> = {
  dificil: "Difíceis de achar",
  uncommon: ROTULO_RARIDADE.uncommon,
  rare: ROTULO_RARIDADE.rare,
  very_rare: ROTULO_RARIDADE.very_rare,
  exclusive: ROTULO_RARIDADE.exclusive,
};

export default function Catalogo() {
  const { composicoes, totalProdutos, error, loading } = useCatalog();

  // Busca e filtro vivem na URL (spec §3.2). Além de tornar o resultado
  // compartilhável por link, é o que faz voltar do detalhe de um bey
  // preservar o filtro que estava aplicado.
  const [params, setParams] = useSearchParams();
  const busca = params.get("q") ?? "";
  const tipoParam = params.get("tipo");
  const tipo: BeyType | "todos" =
    tipoParam && TIPOS.includes(tipoParam as BeyType) ? (tipoParam as BeyType) : "todos";

  const rarParam = params.get("raridade");
  const raridade: FiltroRaridade | "todas" =
    rarParam && (RARIDADES as readonly string[]).includes(rarParam)
      ? (rarParam as FiltroRaridade)
      : "todas";

  const atualizar = (chave: "q" | "tipo" | "raridade", valor: string) => {
    const novo = new URLSearchParams(params);
    if (valor && valor !== "todos" && valor !== "todas") novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo, { replace: true });
  };

  const setBusca = (v: string) => atualizar("q", v);
  const setTipo = (v: BeyType | "todos") => atualizar("tipo", v);
  const setRaridade = (v: FiltroRaridade | "todas") => atualizar("raridade", v);

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
    const termos = termosDaBusca(busca);
    return composicoes.filter((c) => {
      if (tipo !== "todos" && c.lancamentos[0]?.bey_type !== tipo) return false;
      // c.raridade é a MENOR entre os produtos de mesma composição: a pergunta
      // é "quão difícil é chegar nesta composição", e a resposta é o caminho
      // mais fácil que existe para ela.
      if (raridade === "dificil" && c.raridade === "common") return false;
      if (raridade !== "todas" && raridade !== "dificil" && c.raridade !== raridade) return false;
      const indice = [
        c.nome,
        ...c.lancamentos.map((l) => l.release_code),
        ...c.pecas.map((p) => p.part.name),
        // Metade das lâminas tem nome Hasbro diferente do Takara Tomy: quem
        // procura "Keel Shark" está procurando a Shark Edge. Sem isto a busca
        // não devolvia nada, e era o nome que a pessoa conhecia.
        ...c.pecas.flatMap((p) => p.part.aka ?? []),
        // A classe de cada peça entra nos DOIS idiomas: quem procura "catraca"
        // e quem procura "ratchet" precisam achar a mesma coisa.
        ...c.pecas.flatMap((p) => BUSCA_SLOT[p.slot]),
        MARCA[c.lancamentos[0]!.brand].rotulo,
      ].join(" ");
      return casaTermos(indice, termos);
    });
  }, [composicoes, busca, tipo, raridade]);

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
        {TIPOS.map((t) => (
          <button key={t} onClick={() => setTipo(t)} style={estiloFiltro(tipo === t, COR_TIPO[t])}>
            {ROTULO_TIPO[t]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center",
                    marginBottom: 16 }}>
        <span style={{ color: T.textMuted, fontSize: 12.5, marginRight: 2 }}>Raridade</span>
        <button onClick={() => setRaridade("todas")}
                style={estiloFiltro(raridade === "todas", T.accent)}>
          Todas
        </button>
        {RARIDADES.map((r) => (
          <button key={r} onClick={() => setRaridade(r)}
                  style={estiloFiltro(raridade === r,
                                      r === "dificil" ? T.warn : COR_RARIDADE[r])}>
            {ROTULO_FILTRO_RARIDADE[r]}
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
        display: "grid", gap: 14,
        gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
      }}>
        {filtradas.map((comp) => (
          <BeyCard key={comp.chave} comp={comp} maxAtributo={maxAtributo} />
        ))}
      </div>

      {!loading && !error && filtradas.length === 0 && composicoes.length > 0 && (
        <p style={{ color: T.textMuted }}>Nada encontrado para esse filtro.</p>
      )}

      <p style={{ color: T.textMuted, fontSize: 11.5, marginTop: 24, lineHeight: 1.6 }}>
        Piloto da Onda 1 — Basic Line. Produtos com a mesma composição aparecem num
        card só: BX-03 e BX-05 são o mesmo Wizard Arrow, mudando só a caixa.
        A área de imagem já está reservada; as artes entram numa onda futura.
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
