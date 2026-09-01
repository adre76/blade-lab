import { describe, expect, it } from "vitest";
import { confrontos } from "./matchup.ts";
import type { Arquetipo } from "./archetype.ts";

const arq = (extra: Partial<Arquetipo>): Arquetipo => ({
  rotulo: "Ataque", dominante: "attack",
  ordem: ["attack", "defense", "stamina"], qualificadores: [], ...extra,
});

describe("confrontos entre tipos", () => {
  /**
   * O triângulo vem das páginas de tipo da Beyblade Wiki, que o afirmam nos
   * dois sentidos: Defesa é counterpick contra Ataque e fraca contra
   * Resistência; Resistência é vulnerável a Ataque e supera Defesa.
   */
  it("Ataque ganha de Resistência e perde para Defesa", () => {
    const r = confrontos(arq({ dominante: "attack" }));
    expect(r.vence).toEqual(["stamina"]);
    expect(r.perde).toEqual(["defense"]);
  });

  it("Defesa ganha de Ataque e perde para Resistência", () => {
    const r = confrontos(arq({ dominante: "defense", rotulo: "Defesa" }));
    expect(r.vence).toEqual(["attack"]);
    expect(r.perde).toEqual(["stamina"]);
  });

  it("Resistência ganha de Defesa e perde para Ataque", () => {
    const r = confrontos(arq({ dominante: "stamina", rotulo: "Resistência" }));
    expect(r.vence).toEqual(["defense"]);
    expect(r.perde).toEqual(["attack"]);
  });

  it("o triângulo fecha: ninguém ganha ou perde de si mesmo", () => {
    for (const t of ["attack", "defense", "stamina"] as const) {
      const r = confrontos(arq({ dominante: t }));
      expect(r.vence).not.toContain(t);
      expect(r.perde).not.toContain(t);
      expect(r.vence).not.toEqual(r.perde);
    }
  });

  it("toda tendência vem com o porquê", () => {
    for (const t of ["attack", "defense", "stamina"] as const) {
      expect(confrontos(arq({ dominante: t })).porque).toBeTruthy();
    }
  });

  /**
   * Equilibrado não tem contra quem se dar bem nem mal, e dizer que tem seria
   * inventar. O silêncio aqui é a resposta certa.
   */
  it("sem dominante, não há tendência nenhuma", () => {
    const r = confrontos(arq({ dominante: null, rotulo: "Equilibrado — Ataque/Defesa" }));
    expect(r.vence).toEqual([]);
    expect(r.perde).toEqual([]);
    expect(r.porque).toBeNull();
  });

  /**
   * Fragilidade a burst não depende de tipo: quem se desmonta fácil entrega 2
   * pontos a qualquer adversário.
   */
  it("frágil vira alerta, independente do tipo", () => {
    const r = confrontos(arq({ dominante: "defense", qualificadores: ["frágil"] }));
    expect(r.alertas.join(" ")).toContain("Burst Finish");
  });

  it("resistente também é dito, porque é vantagem", () => {
    const r = confrontos(arq({ dominante: "attack", qualificadores: ["resistente"] }));
    expect(r.alertas.join(" ")).toContain("difícil de desmontar");
  });

  it("qualificador de peso não vira alerta de confronto", () => {
    const r = confrontos(arq({ dominante: "attack", qualificadores: ["pesado", "leve"] }));
    expect(r.alertas).toEqual([]);
  });

  it("sem qualificador, nenhum alerta", () => {
    expect(confrontos(arq({})).alertas).toEqual([]);
  });
});
