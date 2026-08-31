import { z } from "zod";
import anatomias from "../../../data/anatomies.json";

export const SLOTS = [
  "lock_chip", "main_blade", "metal_blade", "over_blade",
  "assist_blade", "blade", "ratchet", "bit",
] as const;

/**
 * Slots que carregam `spin_direction`.
 *
 * O sentido de giro é propriedade da lâmina principal, e apenas dela (spec
 * §4.4). Permitir em `over_blade` ou `assist_blade` abriria caminho para
 * cadastrar um Metal Blade destro com um Over Blade canhoto no mesmo bey —
 * combinação fisicamente impossível que passaria por válida.
 */
const LAMINAS_PRINCIPAIS: readonly string[] = ["blade", "main_blade", "metal_blade"];

const Slot = z.enum(SLOTS);
const Linha = z.enum(["BX", "UX", "CX"]);
const Anatomia = z.enum(["basic", "unique", "custom", "custom_expand"]);
const Marca = z.enum(["takara_tomy", "hasbro"]);
const Resistencia = z.enum(["very_low", "low", "medium", "high", "very_high"]);
const Natureza = z.enum(["attack", "defense", "stamina", "balance"]);
const Giro = z.enum(["right", "left", "dual"]);
const Raridade = z.enum(["common", "uncommon", "rare", "very_rare", "exclusive"]);
const TipoLancamento = z.enum([
  "starter", "booster", "random_booster", "deck_set",
  "custom_set", "limited", "event_exclusive", "other",
]);

const Atributo = z.number().int().min(0).max(200);

export const PartSchema = z
  .object({
    slot: Slot,
    brand: Marca.default("takara_tomy"),
    name: z.string().min(1),
    code: z.string().min(1).nullish(),
    line: Linha,
    attack: Atributo,
    defense: Atributo,
    stamina: Atributo,
    weight_g: z.number().positive().max(100).nullish(),
    height_mm: z.number().positive().max(200).nullish(),
    contact_points: z.number().int().positive().max(20).nullish(),
    burst_resistance: Resistencia.nullish(),
    dash_performance: Resistencia.nullish(),
    spin_direction: Giro.nullish(),
    part_type: Natureza.nullish(),
    /** Nome da peça Takara Tomy equivalente. Resolvido para id durante o seed. */
    equivalent_name: z.string().nullish(),
    image_path: z.string().nullish(),
    image_source_url: z.string().url().nullish(),
    source_url: z.string().url(),
    notes: z.string().nullish(),
  })
  .superRefine((p, ctx) => {
    const erro = (campo: string, msg: string) =>
      ctx.addIssue({ code: "custom", path: [campo], message: `${campo}: ${msg}` });

    if (p.spin_direction != null && !LAMINAS_PRINCIPAIS.includes(p.slot)) {
      erro("spin_direction", "só é preenchida na lâmina principal (spec §4.4)");
    }
    if (p.height_mm != null && p.slot !== "ratchet") {
      erro("height_mm", "só existe em ratchet");
    }
    if (p.contact_points != null && p.slot !== "ratchet") {
      erro("contact_points", "só existe em ratchet");
    }
    if (p.dash_performance != null && p.slot !== "bit") {
      erro("dash_performance", "só existe em bit");
    }
  });

export const BeybladeSchema = z
  .object({
    release_code: z.string().min(1),
    name: z.string().min(1),
    line: Linha,
    anatomy: Anatomia,
    brand: Marca.default("takara_tomy"),
    release_type: TipoLancamento,
    /** Nula quando não houve confirmação. Data errada é pior que ausente. */
    release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    rarity: Raridade,
    bey_type: Natureza.nullish(),
    /** Código do bey Takara Tomy equivalente. Resolvido para id durante o seed. */
    equivalent_code: z.string().nullish(),
    image_path: z.string().nullish(),
    image_source_url: z.string().url().nullish(),
    // partialRecord, e não record: no Zod 4, z.record() com um enum como chave
    // torna TODAS as chaves obrigatórias, o que exigiria os 8 slots em todo
    // bey. Quais slots são obrigatórios depende da anatomia, e é o superRefine
    // abaixo que decide isso contra data/anatomies.json.
    parts: z.partialRecord(Slot, z.string().min(1)),
    source_url: z.string().url(),
    notes: z.string().nullish(),
  })
  .superRefine((b, ctx) => {
    // anatomies.json é a MESMA fonte que popula anatomy_slots no banco
    // (spec §4.3). Importá-la aqui é o que impede a validação do arquivo e a
    // do banco de divergirem.
    const tabela = anatomias as Record<string, string[]>;
    const esperados = [...(tabela[b.anatomy] ?? [])].sort();
    const informados = Object.keys(b.parts).sort();

    if (JSON.stringify(esperados) !== JSON.stringify(informados)) {
      ctx.addIssue({
        code: "custom",
        path: ["parts"],
        message:
          `slots não batem com a anatomia '${b.anatomy}': ` +
          `esperado [${esperados.join(", ")}], recebido [${informados.join(", ")}]`,
      });
    }
  });

export type Part = z.infer<typeof PartSchema>;
export type Beyblade = z.infer<typeof BeybladeSchema>;
