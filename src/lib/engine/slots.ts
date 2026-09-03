import { ANATOMIAS } from "../anatomias.ts";
import type { Anatomy, PartSlot, Peca } from "./types.ts";

/**
 * Slots que cada anatomia exige.
 *
 * Vem de `data/anatomies.json`, o MESMO arquivo que popula `anatomy_slots` no
 * banco (spec §4.3). É o que impede o motor e o banco de divergirem: se a
 * composição de uma anatomia mudar, os dois mudam juntos ou o teste de paridade
 * acusa.
 */
export function slotsDe(anatomy: Anatomy): PartSlot[] {
  return (ANATOMIAS[anatomy] ?? []) as PartSlot[];
}

export const ANATOMIAS_CONHECIDAS = Object.keys(ANATOMIAS) as Anatomy[];

/**
 * As anatomias que o catálogo carregado consegue montar, na ordem em que devem
 * ser oferecidas.
 *
 * Duas regras, e as duas existem para o laboratório não oferecer escolha falsa:
 *
 * 1. **Só entra anatomia com peça em todos os slots.** A CX está declarada em
 *    `anatomies.json` e no enum do banco desde a Onda 0, mas não tem nenhuma
 *    peça — oferecê-la abriria cinco seletores vazios. Quando as peças da CX
 *    entrarem, ela aparece sozinha, sem tocar nesta função.
 *
 * 2. **Composições iguais ocupam uma vaga só.** `basic` e `unique` exigem os
 *    mesmos três slots: a diferença entre BX e UX é comercial, não de montagem
 *    (ver a nota em `data/anatomies.json`). Duas opções idênticas produziriam
 *    números idênticos e só dariam ao usuário a chance de escolher errado.
 *
 * `atual` é a anatomia do combo em edição. Ela entra SEMPRE, mesmo que o
 * catálogo não a monte e mesmo que outra já ocupe a vaga da composição dela:
 * um link compartilhado pode trazer qualquer anatomia, e a que está em uso
 * precisa aparecer marcada em vez de sumir da lista.
 */
export function anatomiasMontaveis(pecas: Peca[], atual?: Anatomy): Anatomy[] {
  const comPeca = new Set(pecas.map((p) => p.slot));
  const porComposicao = new Map<string, Anatomy>();

  for (const anatomia of ANATOMIAS_CONHECIDAS) {
    const slots = slotsDe(anatomia);
    if (!slots.length) continue;

    const escolhida = anatomia === atual;
    if (!escolhida && !slots.every((s) => comPeca.has(s))) continue;

    const chave = slots.join("+");
    // Substituir preserva a posição de quem chegou primeiro: trocar o
    // representante da composição não deve reordenar a lista.
    if (porComposicao.has(chave) && !escolhida) continue;
    porComposicao.set(chave, anatomia);
  }

  return [...porComposicao.values()];
}
