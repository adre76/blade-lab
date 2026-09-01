import { z } from "zod";
import bruto from "../../data/faq.json";

/** Ordena a página, do mais concreto para o mais abstrato. */
export const GRUPOS = ["as-pecas", "o-jogo", "comprar", "montar"] as const;
export type Grupo = (typeof GRUPOS)[number];

export const ROTULO_GRUPO: Record<Grupo, string> = {
  "as-pecas": "As peças",
  "o-jogo": "O jogo",
  comprar: "Comprar",
  montar: "Montar",
};

/**
 * De onde veio a resposta.
 *
 * O catálogo exige `source_url` em todo registro; o FAQ carrega a mesma
 * obrigação. Uma criança lendo "a catraca decide o quanto o bey aguenta"
 * merece saber se isso saiu de uma descrição oficial ou da experiência de
 * quem joga.
 */
export const ORIGENS = ["dados", "wiki", "jogador"] as const;
export type Origem = (typeof ORIGENS)[number];

const PerguntaSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    grupo: z.enum(GRUPOS),
    pergunta: z.string().min(1),
    resposta: z.string().min(1),
    origem: z.enum(ORIGENS),
    fonte: z.string().url().nullable(),
    cita_pecas: z.array(z.string().min(1)),
    cita_beys: z.array(z.string().min(1)),
  })
  .superRefine((p, ctx) => {
    if (p.origem === "wiki" && !p.fonte) {
      ctx.addIssue({ code: "custom", path: ["fonte"],
                     message: `'${p.id}': origem 'wiki' exige fonte` });
    }
    if (p.origem !== "wiki" && p.fonte) {
      ctx.addIssue({ code: "custom", path: ["fonte"],
                     message: `'${p.id}': só resposta da wiki tem fonte` });
    }
  });

export type Pergunta = z.infer<typeof PerguntaSchema>;

const Arquivo = z.object({ perguntas: z.array(PerguntaSchema) });

/**
 * O FAQ, validado na importação.
 *
 * Falhar aqui é barato — quebra o `npm test` e o build. Falhar na tela seria
 * uma criança lendo um buraco.
 */
export const PERGUNTAS: Pergunta[] = Arquivo.parse(bruto).perguntas;

export const porGrupo = (grupo: Grupo) => PERGUNTAS.filter((p) => p.grupo === grupo);
