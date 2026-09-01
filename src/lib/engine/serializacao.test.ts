import { describe, expect, it } from "vitest";
import { desserializar, serializar } from "./serializacao.ts";
import type { Combo, Peca } from "./types.ts";

const peca = (id: string, slot: string) => ({ id, slot, name: id } as unknown as Peca);

const CATALOGO = [
  peca("aaa", "blade"), peca("bbb", "ratchet"), peca("ccc", "bit"),
  peca("ddd", "integrated_blade"),
];
const porId = (id: string) => CATALOGO.find((p) => p.id === id) ?? null;

describe("combo na querystring", () => {
  it("serializa anatomia e ids na ordem dos slots", () => {
    const c: Combo = { anatomy: "basic",
      pecas: { blade: CATALOGO[0]!, ratchet: CATALOGO[1]!, bit: CATALOGO[2]! } };
    expect(serializar(c)).toBe("basic:blade=aaa,ratchet=bbb,bit=ccc");
  });

  it("combo incompleto serializa só o que tem", () => {
    expect(serializar({ anatomy: "basic", pecas: { blade: CATALOGO[0]! } }))
      .toBe("basic:blade=aaa");
  });

  it("combo vazio serializa só a anatomia", () => {
    expect(serializar({ anatomy: "basic", pecas: {} })).toBe("basic:");
  });

  it("ida e volta preserva o combo", () => {
    const c: Combo = { anatomy: "unique_expand",
      pecas: { integrated_blade: CATALOGO[3]!, bit: CATALOGO[2]! } };
    expect(desserializar(serializar(c), porId)).toEqual(c);
  });

  it("id que não existe mais no catálogo é ignorado, e o resto sobrevive", () => {
    const r = desserializar("basic:blade=aaa,ratchet=sumiu", porId);
    expect(r?.pecas.blade?.id).toBe("aaa");
    expect(r?.pecas.ratchet).toBeUndefined();
  });

  /**
   * Link adulterado não produz combo impossível: produz combo incompleto.
   * A peça só entra no slot que ela mesma declara.
   */
  it("peça posta num slot que não é o dela é recusada", () => {
    const r = desserializar("basic:blade=ccc", porId);
    expect(r?.pecas.blade).toBeUndefined();
  });

  it("slot que a anatomia não tem é ignorado", () => {
    const r = desserializar("basic:integrated_blade=ddd,blade=aaa", porId);
    expect(r?.pecas.integrated_blade).toBeUndefined();
    expect(r?.pecas.blade?.id).toBe("aaa");
  });

  it("anatomia desconhecida devolve nulo", () => {
    expect(desserializar("inventada:blade=aaa", porId)).toBeNull();
  });

  it("texto malformado devolve nulo em vez de estourar", () => {
    expect(desserializar("", porId)).toBeNull();
    expect(desserializar("sem-dois-pontos", porId)).toBeNull();
  });
});
