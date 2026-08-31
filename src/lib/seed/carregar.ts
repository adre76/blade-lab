import { readFileSync, readdirSync } from "node:fs";
import { PartSchema, BeybladeSchema, type Part, type Beyblade } from "./schema.ts";

/**
 * Carrega e valida os arquivos de `data/`.
 *
 * Compartilhado entre o script de seed e os testes de integridade, de propósito:
 * se as duas leituras divergirem, o teste passa a validar um formato que o seed
 * não usa.
 *
 * **Herança da fonte.** O spec exige `source_url` em todo registro, mas repetir
 * a mesma URL em 150 linhas de JSON é ruído que ninguém revisa. O arquivo
 * declara `_fonte` uma vez e cada registro herda; um registro com procedência
 * própria sobrescreve com seu próprio `source_url`. O que chega ao banco
 * continua tendo a fonte linha a linha.
 */

type Arquivo = { _fonte?: string; [chave: string]: unknown };

function lerArquivos(dir: URL, chave: string): Record<string, unknown>[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const conteudo = JSON.parse(readFileSync(new URL(f, dir), "utf8")) as Arquivo;
      const registros = (conteudo[chave] ?? []) as Record<string, unknown>[];
      return registros.map((r) => ({
        source_url: conteudo._fonte,
        ...r, // o registro vence: fonte própria sobrescreve a do arquivo
      }));
    });
}

export function carregarPartes(raiz: URL): Part[] {
  const brutos = lerArquivos(new URL("parts/", raiz), "parts");
  return brutos.map((p, i) => {
    const r = PartSchema.safeParse(p);
    if (!r.success) {
      throw new Error(
        `peça #${i} (${String(p["name"] ?? "sem nome")}): ` +
          r.error.issues.map((e) => e.message).join("; "),
      );
    }
    return r.data;
  });
}

export function carregarBeyblades(raiz: URL): Beyblade[] {
  const brutos = lerArquivos(new URL("beyblades/", raiz), "beyblades");
  return brutos.map((b, i) => {
    const r = BeybladeSchema.safeParse(b);
    if (!r.success) {
      throw new Error(
        `bey #${i} (${String(b["release_code"] ?? "sem código")}): ` +
          r.error.issues.map((e) => e.message).join("; "),
      );
    }
    return r.data;
  });
}

