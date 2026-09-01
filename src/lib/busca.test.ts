import { describe, expect, it } from "vitest";
import { casaTermos, semAcento, termosDaBusca } from "./busca.ts";
import { BUSCA_SLOT, ROTULO_SLOT } from "../components/rotulos.ts";

/**
 * O índice que o catálogo monta para uma composição: nome, códigos, nomes das
 * peças, a classe de cada peça nos dois idiomas, e a marca.
 */
const INDICE_DRAN_SWORD = [
  "Dran Sword 3-60F", "BX-01",
  "Dran Sword", "3-60", "Flat",
  ...BUSCA_SLOT.blade, ...BUSCA_SLOT.ratchet, ...BUSCA_SLOT.bit,
  "Takara Tomy",
].join(" ");

const acha = (busca: string) => casaTermos(INDICE_DRAN_SWORD, termosDaBusca(busca));

describe("busca do catálogo", () => {
  it("acha pelo nome do produto", () => {
    expect(acha("Dran Sword")).toBe(true);
    expect(acha("BX-01")).toBe(true);
  });

  it("busca vazia não filtra nada", () => {
    expect(acha("")).toBe(true);
    expect(acha("   ")).toBe(true);
  });

  it("não acha o que não está lá", () => {
    expect(acha("Wizard Arrow")).toBe(false);
  });

  /**
   * A garantia que motivou extrair isto do componente.
   *
   * A interface passou a dizer "Catraca" e "Ponta", mas quem vem da comunidade
   * ou de uma lista de produto digita "ratchet" e "bit". Os dois têm de achar.
   */
  it("acha pela classe da peça nos dois idiomas", () => {
    for (const [pt, en] of [["catraca", "ratchet"], ["ponta", "bit"], ["lâmina", "blade"]]) {
      expect(acha(pt!), `português: ${pt}`).toBe(true);
      expect(acha(en!), `inglês: ${en}`).toBe(true);
    }
  });

  it("todo slot exibido pode ser buscado pelo rótulo que a tela mostra", () => {
    const semTermo = (Object.keys(ROTULO_SLOT) as (keyof typeof ROTULO_SLOT)[]).filter(
      (slot) => {
        const rotulo = semAcento(ROTULO_SLOT[slot]);
        return !BUSCA_SLOT[slot].some((t) => semAcento(t).includes(rotulo.split(" ")[0]!));
      },
    );
    expect(semTermo).toEqual([]);
  });

  it("ignora acento nos dois lados", () => {
    expect(acha("lamina")).toBe(true);
    expect(acha("lâmina")).toBe(true);
    expect(semAcento("Resistência")).toBe("resistencia");
  });

  /**
   * O defeito que a busca por substring tinha: exigia que os termos fossem
   * vizinhos no índice. O nome da peça e a classe dela nunca ficam colados,
   * então "ponta Low Flat" nunca casaria.
   */
  it("aceita os termos em qualquer ordem e não exige que sejam vizinhos", () => {
    expect(acha("ponta Flat")).toBe(true);
    expect(acha("Flat ponta")).toBe(true);
    expect(acha("bit Flat")).toBe(true);
    expect(acha("catraca 3-60")).toBe(true);
  });

  it("exige TODOS os termos, não qualquer um", () => {
    expect(acha("Dran Wizard")).toBe(false);
  });

  /**
   * A wiki, as caixas e as listas de produto grafam o nome Takara Tomy sem
   * espaço. Quem copia de lá digita "DranSword", não "Dran Sword".
   */
  it("acha com o nome colado, como a wiki grafa", () => {
    expect(acha("DranSword")).toBe(true);
    expect(acha("dransword")).toBe(true);
  });

  /**
   * O caso que o usuário trouxe: metade das lâminas tem nome Hasbro diferente,
   * e era o único nome que ele conhecia. "Keel Shark" é a Shark Edge.
   */
  it("acha pelo nome alternativo da peça", () => {
    const indice = ["Shark Edge 3-60LF", "BX-14", "Shark Edge", "Keel Shark", "3-60", "Low Flat"]
      .join(" ");
    expect(casaTermos(indice, termosDaBusca("Keel Shark"))).toBe(true);
    expect(casaTermos(indice, termosDaBusca("keel"))).toBe(true);
    expect(casaTermos(indice, termosDaBusca("Shark Edge"))).toBe(true);
  });
});
