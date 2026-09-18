/**
 * Raridade padrão de um bey, derivada do `release_type`.
 *
 * `rarity` é coluna obrigatória em `BeybladeSchema`, mas nenhum módulo de
 * `src/lib/wiki/` a produz — nada no infobox de um bey diz "isto é raro".
 * O que existe é uma correlação publicada pela própria spec (§4.4,
 * `docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`): o TIPO de
 * lançamento já sugere a raridade — um Starter é vendido em prateleira
 * garantida, um Random Booster sai por sorteio dentro da caixa.
 *
 * `BeybladeSchema.superRefine` cobra a recíproca de `rarity`: todo valor
 * diferente de `common` EXIGE `rarity_reason` (etiqueta sem motivo não
 * informa nada — é o problema que a coluna veio resolver). Por isso este
 * módulo devolve os dois campos juntos, nunca só a raridade sozinha: um
 * chamador que escrevesse `rarity: "rare"` sem o motivo correspondente
 * produziria um registro que `carregarBeyblades` reprova.
 *
 * `rarity`/`rarity_reason` de propósito NÃO entram em `CAMPOS_DO_BEY`
 * (`./merge.ts`) — o comentário de lá explica por quê. Consequência para
 * este módulo: o par que ele devolve só é usado na PRIMEIRA coleta de um bey
 * (quando ainda não há registro existente para fundir). Uma correção manual
 * feita depois (como a divisão real de `random_booster` em
 * `uncommon`/`rare`/`very_rare` por caixa, medida no catálogo BX/UX já
 * curado) nunca é sobrescrita por uma recoleta futura — o default é só o
 * ponto de partida, não a última palavra.
 *
 * ATENÇÃO — a mesma proteção também bloqueia a direção oposta: um default
 * ACRESCENTADO a este módulo depois que uma linha já foi coletada pela
 * primeira vez NUNCA alcança os registros que já existiam em `data/`.
 * Recoletar não conserta isso — `fundirRegistro` (`./merge.ts`) preserva o
 * que já está gravado, inclusive a ausência de um campo. É exatamente o que
 * aconteceu no caso que motivou este comentário: as 17 entradas
 * `random_booster` de `data/beyblades/cx.json` foram gravadas numa versão
 * deste módulo que ainda não devolvia `rarity_reason` junto com `rarity`;
 * quando o motivo genérico foi adicionado aqui, essas 17 continuaram sem
 * ele, e `carregarBeyblades` (`./carregar.ts`) passou a rejeitá-las por
 * violar a exigência de `BeybladeSchema.superRefine`. A correção não foi
 * recoletar — foi editar `rarity_reason` diretamente nos 17 registros já
 * existentes, copiando o texto exato que `raridadePadraoDoTipo` já produz
 * para `random_booster`. Um default novo cobre coletas futuras; registros
 * antigos precisam ser preenchidos à mão nos dados.
 */
import type { Beyblade } from "./schema.ts";
import type { TipoLancamento } from "../wiki/indice.ts";

type Raridade = Beyblade["rarity"];

export type RaridadePadrao = { rarity: Raridade; rarity_reason: string | null };

/**
 * A regra da spec, em código:
 *
 *   starter, booster, deck_set, custom_set → common (sem motivo)
 *   random_booster                         → rare (com motivo genérico)
 *   limited, event_exclusive               → sempre curado à mão (ver abaixo)
 *
 * O motivo do `random_booster` é deliberadamente GENÉRICO — "vem de uma
 * caixa por sorteio" — e não cita proporção nenhuma. O catálogo BX/UX já
 * curado tem motivos com número exato ("saem 4 a cada caixa de 24"), mas
 * esse número vem de contagem manual da caixa física ou de uma fonte
 * publicada à parte; nenhum módulo de coleta o produz, e inventar uma
 * proporção seria pior que não ter motivo nenhum. O texto genérico é
 * honesto sobre o que se sabe (é sorteio) e o que não se sabe (a proporção)
 * — o mesmo padrão já usado em `data/beyblades/ux.json` para o BX-50
 * ("a proporção por caixa ainda não foi publicada").
 *
 * `limited` e `event_exclusive` LANÇAM em vez de devolver um motivo
 * genérico: um bey deste tipo é sempre um caso concreto (um prêmio de
 * evento, um lote numerado) que merece o FATO específico, não um rótulo
 * vago — exatamente o problema que `rarity_reason` existe para evitar (ver
 * `ValkyrieVolt S4-70V` e `DranArc S2-70K`, curados à mão em
 * `data/beyblades/cx.json`, cada um com a frase do fato publicado). Também
 * nunca é alcançado de verdade: `tipoDaEntrada` (`../wiki/indice.ts`) nunca
 * devolve estes dois tipos automaticamente — são só valores de enum para
 * curadoria manual direta no arquivo.
 *
 * `other` também lança, pela mesma razão de `tipoDaEntrada` nunca o
 * produzir: inventar uma raridade para um tipo que ninguém gera seria uma
 * regra sem caso real para justificá-la.
 */
export function raridadePadraoDoTipo(tipo: TipoLancamento): RaridadePadrao {
  switch (tipo) {
    case "starter":
    case "booster":
    case "deck_set":
    case "custom_set":
      return { rarity: "common", rarity_reason: null };
    case "random_booster":
      return {
        rarity: "rare",
        rarity_reason:
          "Vem de uma caixa por sorteio (Random Booster), não é vendido avulso na loja; "
          + "a proporção exata de saída dentro da caixa ainda não foi conferida.",
      };
    case "limited":
    case "event_exclusive":
      throw new Error(
        `raridadePadraoDoTipo: '${tipo}' não tem motivo padrão — sempre exige curadoria `
        + "manual com o fato específico (prêmio de evento, lote limitado etc.); um motivo "
        + "genérico aqui seria uma explicação inventada, não a de verdade. Este tipo nunca "
        + "é produzido automaticamente pelo coletor (tipoDaEntrada, em ../wiki/indice.ts, "
        + "nunca devolve nenhum dos dois) — chegar aqui com ele é bug do chamador.",
      );
    default:
      throw new Error(
        `raridadePadraoDoTipo: sem regra de raridade padrão para o tipo '${tipo}' `
        + "(spec §4.4) — precisa de curadoria manual, não de um palpite.",
      );
  }
}
