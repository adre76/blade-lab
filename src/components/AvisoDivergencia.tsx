import { T } from "../theme.ts";

/**
 * Sinaliza um registro cujos valores divergem entre as fontes públicas.
 *
 * Não confundir com a ressalva geral do catálogo: *todos* os atributos são
 * medição de comunidade, e isso está dito em /creditos. Este aviso é mais
 * específico — as fontes **não concordam entre si** sobre este registro.
 *
 * A alternativa seria omitir o dado. Foi descartada porque esconde informação
 * que temos: é melhor mostrar o valor mais citado, dizer que há divergência e
 * deixar o leitor julgar.
 */
export default function AvisoDivergencia({
  ativo,
  detalhe,
  compacto = false,
}: {
  ativo: boolean;
  detalhe?: string | null;
  compacto?: boolean;
}) {
  if (!ativo) return null;

  if (compacto) {
    return (
      <span
        title={detalhe ?? "As fontes divergem sobre este registro"}
        style={{
          color: T.warn,
          border: `1px solid ${T.warn}44`,
          background: `${T.warn}14`,
          borderRadius: 999,
          padding: "2px 9px",
          fontSize: 11.5,
          whiteSpace: "nowrap",
        }}
      >
        fontes divergem
      </span>
    );
  }

  return (
    <div style={{
      background: `${T.warn}12`,
      border: `1px solid ${T.warn}40`,
      borderRadius: 9,
      padding: "11px 13px",
      marginTop: 14,
    }}>
      <strong style={{ color: T.warn, fontSize: 13 }}>
        As fontes divergem sobre este registro
      </strong>
      <p style={{ margin: "5px 0 0", color: T.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
        {detalhe ??
          "Não há valor oficial publicado e as fontes consultadas não concordam. " +
            "O número exibido é o mais citado."}
      </p>
    </div>
  );
}
