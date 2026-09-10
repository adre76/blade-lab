import { describe, expect, it } from "vitest";
import {
  CAMPOS_DA_PECA, CAMPOS_DO_BEY,
  chaveDeBey, chaveDePeca,
  fundirRegistro, fundirRegistros,
} from "./merge.ts";

// Registros mínimos, só com os campos relevantes para cada teste — as
// funções deste módulo operam sobre objetos simples, sem validar schema.
// `Registro` é o mesmo `Record<string, unknown>` frouxo que `merge.ts` usa;
// anotar cada literal com ele evita que o TypeScript infira um tipo
// estrutural estreito demais a partir do primeiro literal e depois recuse o
// segundo por "faltam campos" — o par existente/fresco de uma fusão real
// nunca tem exatamente os mesmos campos.
type Registro = Record<string, unknown>;

// `fundirRegistros` é genérica em T; ao testar com `Registro` (frouxo) a
// chave precisa da mesma soltura — daqui em diante usa-se esta variante, não
// `chaveDePeca`/`chaveDeBey` diretamente, que continuam com o tipo estrito
// exercitado pelos describes acima.
const chavePecaSolta = chaveDePeca as (r: Registro) => string;
const chaveBeySolta = chaveDeBey as (r: Registro) => string;

describe("chaveDePeca", () => {
  it("produz brand|slot|name — o mesmo formato do onConflict de scripts/seed.ts", () => {
    expect(chaveDePeca({ brand: "takara_tomy", slot: "bit", name: "Rush" }))
      .toBe("takara_tomy|bit|Rush");
  });

  it("assume takara_tomy quando a marca não vem no registro", () => {
    expect(chaveDePeca({ slot: "bit", name: "Rush" })).toBe("takara_tomy|bit|Rush");
  });
});

describe("chaveDeBey", () => {
  it("produz brand|release_code|name — o mesmo formato do onConflict de scripts/seed.ts", () => {
    expect(chaveDeBey({ brand: "takara_tomy", release_code: "CX-01", name: "Dran Sword" }))
      .toBe("takara_tomy|CX-01|Dran Sword");
  });

  it("assume takara_tomy quando a marca não vem no registro", () => {
    expect(chaveDeBey({ release_code: "CX-01", name: "Dran Sword" }))
      .toBe("takara_tomy|CX-01|Dran Sword");
  });
});

describe("chaveDePeca x chaveDeBey", () => {
  it("uma peça e um bey com o mesmo nome não colidem", () => {
    // Nomes iguais, mas o componente que desambigua é outro: slot para peça,
    // release_code para bey. É exatamente a distinção que a versão antiga
    // (uma função só, adivinhando `r.slot ?? r.release_code`) não garantia —
    // funcionava por coincidência de forma dos dados, não por construção.
    const peca = { brand: "takara_tomy" as const, slot: "bit", name: "Wizard" };
    const bey = { brand: "takara_tomy" as const, release_code: "BX-01", name: "Wizard" };
    expect(chaveDePeca(peca)).not.toBe(chaveDeBey(bey));
  });
});

describe("fundirRegistro", () => {
  it("sem existente, o fresco entra inteiro", () => {
    const fresco: Registro = { slot: "bit", name: "Rush", weight_g: 3.5 };
    expect(fundirRegistro(undefined, fresco, CAMPOS_DA_PECA)).toEqual(fresco);
  });

  it("campo curado ausente do fresco sobrevive à fusão", () => {
    // rarity, rarity_reason e release_type não vêm de pecaDaPagina/beyDaPagina
    // — são curadoria manual. O fresco nem os carrega; a fusão tem que
    // preservá-los vindos do existente.
    const existente: Registro = {
      release_code: "CX-01", name: "Dran Sword", brand: "takara_tomy",
      rarity: "rare", rarity_reason: "só no deck set de lançamento",
      release_type: "deck_set",
    };
    const fresco: Registro = {
      release_code: "CX-01", name: "Dran Sword", brand: "takara_tomy",
      bey_type: "attack",
    };
    const fundido = fundirRegistro(existente, fresco, CAMPOS_DO_BEY);
    expect(fundido["rarity"]).toBe("rare");
    expect(fundido["rarity_reason"]).toBe("só no deck set de lançamento");
    expect(fundido["release_type"]).toBe("deck_set");
  });

  it("campo do coletor é sobrescrito pelo valor fresco, mesmo null", () => {
    // Uma peça que perdeu o peso publicado tem que mostrar null, não manter
    // um número obsoleto — null aqui é informação, não "sem novidade".
    const existente: Registro = { slot: "blade", name: "Dran Sword", weight_g: 34.9 };
    const fresco: Registro = { slot: "blade", name: "Dran Sword", weight_g: null };
    const fundido = fundirRegistro(existente, fresco, CAMPOS_DA_PECA);
    expect(fundido["weight_g"]).toBeNull();
  });

  it("campo curado não vira null só porque o fresco não o carrega", () => {
    const existente: Registro = { slot: "ratchet", name: "3-60", code: "3-60" };
    const fresco: Registro = { slot: "ratchet", name: "3-60", weight_g: 5.1 };
    const fundido = fundirRegistro(existente, fresco, CAMPOS_DA_PECA);
    expect(fundido["code"]).toBe("3-60");
  });
});

describe("fundirRegistros", () => {
  it("registro só no existente sobrevive (upsert-only)", () => {
    const existentes: Registro[] = [{ slot: "bit", name: "Rush", brand: "takara_tomy" }];
    const resultado = fundirRegistros(existentes, [], chavePecaSolta, CAMPOS_DA_PECA);
    expect(resultado).toEqual(existentes);
  });

  it("registro só no fresco é adicionado", () => {
    const fresco: Registro = { slot: "bit", name: "Flow", brand: "takara_tomy" };
    const resultado = fundirRegistros([], [fresco], chavePecaSolta, CAMPOS_DA_PECA);
    expect(resultado).toEqual([fresco]);
  });

  it("preserva campos curados de partes ausentes na coleta fresca", () => {
    const existentes: Registro[] = [{
      slot: "ratchet", name: "3-60", brand: "takara_tomy",
      code: "3-60", contact_points: 3, image_path: "parts/ratchet-3-60.webp",
    }];
    const frescos: Registro[] = [{
      slot: "ratchet", name: "3-60", brand: "takara_tomy", weight_g: 5.1,
    }];
    const [fundido] = fundirRegistros(existentes, frescos, chavePecaSolta, CAMPOS_DA_PECA);
    expect(fundido!["code"]).toBe("3-60");
    expect(fundido!["contact_points"]).toBe(3);
    expect(fundido!["image_path"]).toBe("parts/ratchet-3-60.webp");
    expect(fundido!["weight_g"]).toBe(5.1);
  });

  it("sobrescreve campo do coletor com null quando a fonte deixa de publicar", () => {
    const existentes: Registro[] =
      [{ slot: "blade", name: "Dran Sword", brand: "takara_tomy", weight_g: 34.9 }];
    const frescos: Registro[] =
      [{ slot: "blade", name: "Dran Sword", brand: "takara_tomy", weight_g: null }];
    const [fundido] = fundirRegistros(existentes, frescos, chavePecaSolta, CAMPOS_DA_PECA);
    expect(fundido!["weight_g"]).toBeNull();
  });

  it("uma peça e um bey homônimos não se confundem quando fundidos em listas separadas", () => {
    const pecasExistentes: Registro[] =
      [{ slot: "bit", name: "Wizard", brand: "takara_tomy", code: "curado" }];
    const pecasFrescas: Registro[] = [{ slot: "bit", name: "Wizard", brand: "takara_tomy" }];
    const beysExistentes: Registro[] = [{
      release_code: "BX-01", name: "Wizard", brand: "takara_tomy", rarity: "rare",
    }];
    const beysFrescos: Registro[] =
      [{ release_code: "BX-01", name: "Wizard", brand: "takara_tomy" }];

    const pecas = fundirRegistros(pecasExistentes, pecasFrescas, chavePecaSolta, CAMPOS_DA_PECA);
    const beys = fundirRegistros(beysExistentes, beysFrescos, chaveBeySolta, CAMPOS_DO_BEY);

    expect(pecas).toHaveLength(1);
    expect(pecas[0]!["code"]).toBe("curado");
    expect(beys).toHaveLength(1);
    expect(beys[0]!["rarity"]).toBe("rare");
  });
});
