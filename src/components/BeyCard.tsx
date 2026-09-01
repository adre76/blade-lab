import { useState } from "react";
import { T } from "../theme.ts";
import { somaBruta, type Composicao } from "../hooks/useCatalog.ts";
import { urlImagem } from "../lib/imagens.ts";
import AvisoDivergencia from "./AvisoDivergencia.tsx";
import ControleInventario from "./ControleInventario.tsx";

import { Link } from "react-router-dom";

import {
  COR_TIPO, ROTULO_TIPO, MARCA, ROTULO_SLOT,
  ROTULO_RARIDADE, COR_RARIDADE, ROTULO_LANCAMENTO,
} from "./rotulos.ts";

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

/**
 * Área de imagem do card.
 *
 * A proporção é fixa e o espaço é sempre ocupado, mesmo sem imagem — é o que
 * faz o grid nascer na densidade definitiva. Quando a onda de imagens
 * preencher `image_path` no banco, a foto aparece aqui sem nenhuma mudança de
 * layout: é só o placeholder dando lugar à imagem.
 *
 * Se a imagem existir no banco mas falhar ao carregar (arquivo removido do
 * bucket, rede ruim), volta ao placeholder em vez de deixar um buraco.
 */
function Imagem({ caminho, cor, alt }: { caminho: string | null; cor: string; alt: string }) {
  const [falhou, setFalhou] = useState(false);
  const url = falhou ? null : urlImagem(caminho);

  return (
    <div style={{
      // 16/9 em vez de algo mais quadrado: a arte do bey é apresentada de
      // perspectiva, cabe bem numa faixa, e um bloco alto demais faria o
      // placeholder vazio dominar o card antes de as imagens existirem.
      aspectRatio: "16 / 9",
      // Teto de altura para que uma coluna larga não estique a faixa a ponto
      // de a imagem dominar o card. Sem isso o card muda de proporção
      // conforme a largura da tela.
      maxHeight: 165,
      // Fundo CLARO, e não o gradiente escuro do tema.
      //
      // As artes de produto da wiki vêm de dois jeitos: algumas com fundo
      // branco opaco, outras com transparência. Sobre fundo escuro isso
      // produzia uma faixa branca em alguns cards e escura em outros — a
      // grade inteira ficava desalinhada visualmente.
      //
      // Padronizar em claro resolve os dois casos de uma vez, e é o fundo
      // para o qual essas artes foram desenhadas: elas ganham contraste em
      // vez de sumir. O acento da natureza fica na borda esquerda do card,
      // que já cumpre o papel de identificar o tipo.
      background: `linear-gradient(140deg, #ffffff, #e8ecf1 70%)`,
      borderBottom: `1px solid ${T.border}`,
      borderRadius: "9px 9px 0 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          onError={() => setFalhou(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        // Placeholder: o mesmo desenho do ícone do app, na cor da natureza.
        // Placeholder sobre fundo claro: opacidade menor, para insinuar a
        // ausência da arte sem competir com os cards que já a têm.
        <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden="true"
             style={{ opacity: 0.22 }}>
          <circle cx="32" cy="32" r="19" fill="none" stroke={cor} strokeWidth="5" />
          <circle cx="32" cy="32" r="6" fill={cor} />
        </svg>
      )}
    </div>
  );
}

export default function BeyCard({ comp, maxAtributo }: {
  comp: Composicao; maxAtributo: number;
}) {
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
    <Link
      to={`/bey/${principal.id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${cor}`,
        borderRadius: 10,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Imagem caminho={principal.image_path} cor={cor} alt={comp.nome} />

      <div style={{ padding: "13px 16px 14px", display: "flex", flexDirection: "column", flex: 1 }}>
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
            <Etiqueta texto={`${comp.lancamentos.length} versões`} cor={T.textMuted} />
          )}
          <AvisoDivergencia
            ativo={principal.data_disputed}
            detalhe={principal.notes}
            compacto
          />
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
              {/*
                Metade das lâminas tem nome Hasbro diferente, e muita gente
                conhece a peça só por esse. Mostrar os dois aqui responde de
                uma vez — antes disso, achar pelo nome Hasbro devolvia um card
                que não trazia esse nome em lugar nenhum, e parecia resultado
                errado.
              */}
              {part.aka?.length ? (
                <span style={{ color: T.textMuted }}>{" / "}{part.aka[0]}</span>
              ) : null}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gap: 4, marginTop: "auto" }}>
          <Barra rotulo="Ataque" valor={soma.attack} max={maxAtributo} cor={T.typeAttack} />
          <Barra rotulo="Defesa" valor={soma.defense} max={maxAtributo} cor={T.typeDefense} />
          <Barra rotulo="Resistência" valor={soma.stamina} max={maxAtributo} cor={T.typeStamina} />
        </div>

        <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px solid ${T.border}` }}>
          <ControleInventario beybladeId={principal.id} compacto />
        </div>

        <footer style={{
          marginTop: 9, paddingTop: 9, borderTop: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", gap: 10,
          fontSize: 11.5, color: T.textMuted,
        }}>
          <span>{tiposLancamento.join(" · ")}</span>
          <span style={{ whiteSpace: "nowrap" }}>
            {soma.weight_g.toFixed(1)} g{soma.pesoParcial && "*"}
            {" · "}
            <span
              title={comp.motivoRaridade ?? undefined}
              style={{ color: COR_RARIDADE[comp.raridade],
                       cursor: comp.motivoRaridade ? "help" : undefined }}
            >
              {ROTULO_RARIDADE[comp.raridade]}
            </span>
          </span>
        </footer>
      </div>
    </Link>
  );
}
