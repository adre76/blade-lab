import { ANATOMIAS_CONHECIDAS, slotsDe } from "../engine/slots.ts";
import type { Anatomy, PartSlot } from "../engine/types.ts";

/**
 * Campo do infobox → slot.
 *
 * A anatomia de um bey sai de QUAIS campos de peça o infobox declara, e não do
 * campo `System`. A regra antiga era frágil: `System2` distingue o Expand Blade
 * mas também carrega `X-Over Project` nos beys de colaboração, então testar a
 * presença dele daria anatomia errada para o Lightning L-Drago (spec §2.3).
 *
 * A busca é por chave EXATA. `Ratchet` é prefixo de `RatchetBlade` e de
 * `RatchetBit`; casar por prefixo daria catraca a um bey que não tem catraca.
 */
export const CAMPO_POR_SLOT: Record<string, PartSlot> = {
  BladeX: "blade",
  Blade: "blade",
  RatchetBlade: "integrated_blade",
  LockChip: "lock_chip",
  MainBlade: "main_blade",
  MetalBlade: "metal_blade",
  OverBlade: "over_blade",
  AssistBlade: "assist_blade",
  Ratchet: "ratchet",
  RatchetBit: "integrated_bit",
  Bit: "bit",
};

/**
 * Slot → nome da peça, para os campos preenchidos.
 *
 * Mais de um campo do infobox pode mapear para o mesmo slot (`BladeX` e
 * `Blade`, ambos → "blade"). Se uma página declarar os dois com valores
 * DIFERENTES, escolher um e descartar o outro em silêncio seria exatamente a
 * adivinhação que este módulo existe para evitar — lança nomeando o slot, os
 * dois campos e os dois valores. Mesmo valor nos dois campos não é uma
 * divergência de dado (é redundância inofensiva, ex.: página em transição de
 * um campo para o outro), então não lança nesse caso.
 */
export function pecasDoInfobox(box: Map<string, string>): Map<PartSlot, string> {
  const pecas = new Map<PartSlot, string>();
  const origemPorSlot = new Map<PartSlot, string>();
  for (const [campo, slot] of Object.entries(CAMPO_POR_SLOT)) {
    const valor = box.get(campo)?.trim();
    if (!valor) continue;

    const valorExistente = pecas.get(slot);
    if (valorExistente !== undefined) {
      if (valorExistente === valor) continue;
      const campoExistente = origemPorSlot.get(slot);
      throw new Error(
        `campos conflitantes para o slot "${slot}": `
        + `${campoExistente}="${valorExistente}" e ${campo}="${valor}"`,
      );
    }
    pecas.set(slot, valor);
    origemPorSlot.set(slot, campo);
  }
  return pecas;
}

const assinatura = (slots: PartSlot[]) => [...slots].sort().join("+");

/**
 * Assinatura de slots → anatomia.
 *
 * `basic` e `unique` têm a MESMA assinatura (`bit+blade+ratchet`): a diferença
 * entre BX e UX é comercial, não de montagem. Quem chega primeiro fica com a
 * vaga — e a ordem vem de `data/anatomies.json`, onde `basic` vem antes. A
 * linha comercial de um bey sai do campo `System`, não daqui.
 */
const POR_ASSINATURA = new Map<string, Anatomy>();
for (const a of ANATOMIAS_CONHECIDAS) {
  const chave = assinatura(slotsDe(a));
  if (!POR_ASSINATURA.has(chave)) POR_ASSINATURA.set(chave, a);
}

/**
 * A anatomia do bey, ou uma exceção.
 *
 * Falhar alto é o ponto: todo defeito de dado das ondas anteriores foi uma
 * adivinhação silenciosa. Um conjunto de slots desconhecido é composição nova
 * ou erro de leitura, e nos dois casos parar é melhor que escolher a anatomia
 * mais parecida.
 */
export function anatomiaDe(box: Map<string, string>): Anatomy {
  const slots = [...pecasDoInfobox(box).keys()];
  if (!slots.length) {
    throw new Error("infobox não declara nenhum campo de peça conhecido");
  }

  const chave = assinatura(slots);
  const anatomia = POR_ASSINATURA.get(chave);
  if (!anatomia) {
    throw new Error(
      `conjunto de slots sem anatomia conhecida: ${chave}. `
      + `Se for composição nova, acrescente-a a data/anatomies.json e ao enum anatomy.`,
    );
  }
  return anatomia;
}
