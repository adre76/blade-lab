# Porta de entrada — plano de implementação

> **Para executores:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam `- [ ]` para acompanhamento.

**Objetivo:** Dar ao site uma porta de entrada — uma landing que explica o que ele faz e um FAQ que dá a uma criança o vocabulário para ler o resto.

**Arquitetura:** O conteúdo do FAQ vive em `data/faq.json`, importado direto pelo app (não passa pelo banco), validado por Zod e coberto por testes que verificam que toda peça citada existe no catálogo. Os números que aparecem nas telas são calculados do catálogo carregado, nunca escritos no texto.

**Stack:** TypeScript, React 19, react-router-dom v7, Zod, Vitest. Nenhuma dependência nova.

**Spec:** [`docs/superpowers/specs/2026-09-01-porta-de-entrada-design.md`](../specs/2026-09-01-porta-de-entrada-design.md)

## Restrições globais

- **Nenhuma dependência nova.**
- **`data/faq.json` NÃO vai para o banco.** É importado pelo app, como `data/anatomies.json`.
- **Registro do texto:** o leitor é uma criança que já joga, lendo sozinha no celular. Frase curta, nenhum jargão usado antes de explicado.
- **Nenhuma resposta sem `origem`.** `wiki` exige `fonte`; `dados` e `jogador` não a têm.
- **Nenhum número escrito à mão** onde o catálogo pode calculá-lo.
- **Rótulos em pt-BR** conforme `src/components/rotulos.ts`: Lâmina, Catraca, Ponta; Ataque, Defesa, Resistência, Equilíbrio.
- **`npm test` e `npx tsc --noEmit` passam ao fim de cada tarefa.**

## O que este plano NÃO entrega

As duas perguntas de estratégia da spec §6.3 — *o que cada parte muda no giro* e *por que um bey é de ataque ou de defesa*. Elas dependem de texto do usuário e **não entram até ele existir**. Nenhuma tarefa aqui as menciona como pendência na tela: elas simplesmente não estão no `faq.json`, e a página não mostra buraco.

Ao terminar, o executor deve reportar ao usuário a lista de §6.3 mais estes dois itens que a Beyblade Wiki não publica e que a Task 5 deixou de fora por isso:

- quanto vale um **Spin Finish** (quando o adversário para de girar)
- quantos pontos fecham uma partida

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `data/faq.json` | O conteúdo. Uma pergunta por objeto |
| `src/lib/faq.ts` | Schema Zod, carga e tipos. Sem React |
| `src/lib/faq.test.ts` | Integridade do FAQ contra o catálogo |
| `src/lib/rotas.ts` | Decide o destino de `/` a partir da querystring |
| `src/lib/rotas.test.ts` | Testes dessa decisão |
| `src/components/Faq.tsx` | A página do FAQ |
| `src/components/Landing.tsx` | A landing |
| `src/components/UltimosLancamentos.tsx` | Bloco de lançamentos recentes, usado pela landing |
| `src/components/NumerosDoCatalogo.tsx` | Os números calculados que as respostas embutem |

Um arquivo por responsabilidade, como o resto do projeto. `rotas.ts` existe separado porque a decisão de redirecionar é lógica pura e precisa de teste — dentro do componente ela não teria.

---

## Task 1: Rotas e o redirecionamento que salva os links

Hoje `/` é o catálogo. A landing precisa da raiz, o que empurra o catálogo para `/catalogo`. Existem links compartilhados apontando para `/?q=…`, `/?raridade=…` e `/?combo=…` — eles nasceram da decisão da Onda 1 de guardar filtro na querystring justamente para serem compartilháveis, e quebrá-los agora desmentiria aquela decisão.

**Arquivos:**
- Criar: `src/lib/rotas.ts`
- Criar: `src/lib/rotas.test.ts`
- Criar: `src/components/Landing.tsx` (provisória nesta tarefa; a Task 7 a completa)
- Modificar: `src/main.tsx`
- Modificar: `src/App.tsx` (link do cabeçalho aponta para `/catalogo`)

**Interfaces:**
- Produz: `destinoDaRaiz(busca: string): string | null`

- [ ] **Passo 1: escrever o teste que falha**

Crie `src/lib/rotas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { destinoDaRaiz } from "./rotas.ts";

describe("destino da raiz", () => {
  it("raiz limpa fica na landing", () => {
    expect(destinoDaRaiz("")).toBeNull();
    expect(destinoDaRaiz("?")).toBeNull();
  });

  it("busca compartilhada vai para o catálogo, com a querystring inteira", () => {
    expect(destinoDaRaiz("?q=Keel+Shark")).toBe("/catalogo?q=Keel+Shark");
  });

  it("filtro de tipo e de raridade também", () => {
    expect(destinoDaRaiz("?tipo=attack")).toBe("/catalogo?tipo=attack");
    expect(destinoDaRaiz("?raridade=very_rare")).toBe("/catalogo?raridade=very_rare");
  });

  it("preserva vários parâmetros de uma vez", () => {
    expect(destinoDaRaiz("?q=dran&raridade=rare")).toBe("/catalogo?q=dran&raridade=rare");
  });

  /** O combo é do laboratório, não do catálogo: o link vai para /lab. */
  it("combo vai para o laboratório", () => {
    expect(destinoDaRaiz("?combo=basic:blade=abc")).toBe("/lab?combo=basic:blade=abc");
  });

  it("parâmetro que não é nosso não redireciona nada", () => {
    expect(destinoDaRaiz("?utm_source=twitter")).toBeNull();
  });

  it("parâmetro nosso junto de um alheio ainda redireciona, e leva os dois", () => {
    expect(destinoDaRaiz("?q=dran&utm_source=x")).toBe("/catalogo?q=dran&utm_source=x");
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/lib/rotas.test.ts`
Esperado: FALHA — `Cannot find module './rotas.ts'`

- [ ] **Passo 3: implementar**

Crie `src/lib/rotas.ts`:

```ts
/**
 * Para onde vai uma visita à raiz, olhando só a querystring.
 *
 * Até a landing existir, `/` ERA o catálogo, e os links compartilhados
 * apontam para lá com filtro na querystring — foi para isso que a Onda 1 pôs
 * o filtro na URL. Mover o catálogo sem tratar esses links desmentiria aquela
 * decisão.
 *
 * Não é medida de transição: a querystring é o sinal de que aquele link foi
 * feito para uma tela específica, e continua sendo.
 *
 * Devolve `null` quando não há para onde mandar — aí a raiz mostra a landing.
 */
const DO_CATALOGO = ["q", "tipo", "raridade"];
const DO_LABORATORIO = ["combo"];

export function destinoDaRaiz(busca: string): string | null {
  const params = new URLSearchParams(busca);
  const tem = (chaves: string[]) => chaves.some((c) => params.has(c));

  // O laboratório vem primeiro: um link com `combo` é dele, mesmo que
  // carregue algum resto de filtro.
  if (tem(DO_LABORATORIO)) return `/lab?${params.toString()}`;
  if (tem(DO_CATALOGO)) return `/catalogo?${params.toString()}`;
  return null;
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/lib/rotas.test.ts`
Esperado: PASSA, 7 testes.

- [ ] **Passo 5: landing provisória**

Crie `src/components/Landing.tsx`. A Task 7 a completa; aqui ela só precisa existir para a rota funcionar.

```tsx
import { Navigate, useLocation } from "react-router-dom";
import { T } from "../theme.ts";
import { destinoDaRaiz } from "../lib/rotas.ts";

export default function Landing() {
  const { search } = useLocation();
  const destino = destinoDaRaiz(search);
  if (destino) return <Navigate to={destino} replace />;

  return (
    <section>
      <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Blade X Lab</h2>
      <p style={{ color: T.textSecondary, fontSize: 14 }}>
        Catálogo, inventário e laboratório de Beyblade X.
      </p>
    </section>
  );
}
```

`replace` e não `push`: o link antigo não deve ficar no histórico, senão o botão voltar devolve a pessoa para o redirecionamento e ela fica presa.

- [ ] **Passo 6: registrar as rotas**

Em `src/main.tsx`, `import Landing from "./components/Landing.tsx";` no topo, e as rotas passam a ser:

```tsx
              <Route path="/" element={<Landing />} />
              <Route path="/catalogo" element={<Catalogo />} />
```

O `<Route path="*" element={<Catalogo />} />` no fim vira `<Route path="*" element={<Landing />} />`: uma URL desconhecida deve levar a quem explica o site, não a uma grade sem contexto.

- [ ] **Passo 7: corrigir os links internos**

```bash
grep -rn 'to="/"' src
```

Cada um desses apontava para o catálogo. Em `DetalheBey.tsx` e `DetalhePeca.tsx` o link diz "← catálogo" — passa a `to="/catalogo"`. Em `App.tsx`, o título do cabeçalho continua indo para `/`, que agora é a landing, e isso está certo.

- [ ] **Passo 8: verificar no navegador**

```bash
npm run dev
```

- `http://localhost:5173/` mostra a landing provisória
- `http://localhost:5173/?q=Keel+Shark` cai em `/catalogo?q=Keel+Shark` com os 7 resultados
- `http://localhost:5173/catalogo` mostra o catálogo
- o link "← catálogo" numa ficha de bey volta para `/catalogo`

- [ ] **Passo 9: commitar**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "feat(rotas): landing na raiz, catalogo em /catalogo, links antigos preservados"
```

---

## Task 2: O formato do FAQ, com a primeira pergunta

**Arquivos:**
- Criar: `data/faq.json`
- Criar: `src/lib/faq.ts`
- Criar: `src/lib/faq.test.ts`

**Interfaces:**
- Consome: `carregarPartes` e `carregarBeyblades` de `src/lib/seed/carregar.ts`
- Produz: `PERGUNTAS: Pergunta[]`, `type Pergunta`, `GRUPOS`

- [ ] **Passo 1: escrever o conteúdo com uma pergunta só**

Crie `data/faq.json`:

```json
{
  "_nota": "Conteudo do FAQ. NAO vai para o banco: e importado direto pelo app, como anatomies.json. O campo `origem` diz de onde veio cada resposta -- `dados` sai do nosso catalogo, `wiki` tem fonte obrigatoria, `jogador` e conhecimento de quem joga. Nenhuma resposta existe sem dizer de onde veio, pela mesma razao que todo registro do catalogo tem source_url.",
  "perguntas": [
    {
      "id": "quantas-pecas",
      "grupo": "as-pecas",
      "pergunta": "De quantas peças é feito um Beyblade X?",
      "resposta": "De três, quase sempre: a Lâmina, a Catraca e a Ponta.\n\nA Lâmina é o disco grande de cima. É ela que dá o nome ao bey e decide o jeito dele lutar.\n\nA Catraca fica no meio e escolhe a altura: quanto mais baixa, mais rente ao chão o bey gira.\n\nA Ponta é a peça de baixo, a única que encosta no estádio.\n\nTem uma exceção. Em alguns beys da linha UX a catraca já vem grudada na lâmina, e aí são só duas peças — o Glory Valkyrie LF é um desses.",
      "origem": "dados",
      "fonte": null,
      "cita_pecas": [],
      "cita_beys": ["UX-20"]
    }
  ]
}
```

- [ ] **Passo 2: escrever o teste que falha**

Crie `src/lib/faq.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PERGUNTAS, GRUPOS } from "./faq.ts";
import { carregarPartes, carregarBeyblades } from "./seed/carregar.ts";

const RAIZ = new URL("../../data/", import.meta.url);
const partes = carregarPartes(RAIZ);
const beys = carregarBeyblades(RAIZ);

describe("integridade do FAQ", () => {
  it("há perguntas para verificar", () => {
    expect(PERGUNTAS.length).toBeGreaterThan(0);
  });

  /**
   * A razão de o FAQ morar em arquivo versionado e não numa tabela: quando o
   * catálogo muda, uma resposta que cita peça que saiu quebra aqui, em vez de
   * envelhecer calada na tela.
   */
  it("toda peça citada existe no catálogo", () => {
    const existem = new Set(partes.map((p) => p.name));
    const quebradas = PERGUNTAS.flatMap((p) =>
      p.cita_pecas.filter((n) => !existem.has(n)).map((n) => `${p.id}: '${n}'`),
    );
    expect(quebradas).toEqual([]);
  });

  it("todo bey citado existe no catálogo", () => {
    const existem = new Set(beys.map((b) => b.release_code));
    const quebrados = PERGUNTAS.flatMap((p) =>
      p.cita_beys.filter((c) => !existem.has(c)).map((c) => `${p.id}: '${c}'`),
    );
    expect(quebrados).toEqual([]);
  });

  it("resposta da wiki tem fonte; as outras não têm", () => {
    const erradas = PERGUNTAS.filter((p) =>
      p.origem === "wiki" ? !p.fonte : Boolean(p.fonte),
    ).map((p) => `${p.id} (${p.origem})`);
    expect(erradas).toEqual([]);
  });

  it("id é único", () => {
    const vistos = new Set<string>();
    const repetidos = PERGUNTAS.filter((p) => {
      if (vistos.has(p.id)) return true;
      vistos.add(p.id);
      return false;
    }).map((p) => p.id);
    expect(repetidos).toEqual([]);
  });

  it("todo grupo é um dos previstos", () => {
    const fora = PERGUNTAS.filter((p) => !GRUPOS.includes(p.grupo)).map((p) => p.id);
    expect(fora).toEqual([]);
  });

  /**
   * O mesmo cuidado que já protege as notas do catálogo: `resposta` é texto
   * que uma criança lê, não comentário de desenvolvedor.
   */
  it("nenhuma resposta cita nome de coluna do banco", () => {
    const TECNICOS = [
      "release_type", "release_code", "burst_resistance", "part_type",
      "spin_direction", "rarity_reason", "data_disputed", "weight_g",
      "height_mm", "source_url", "contact_points",
    ];
    const vazando = PERGUNTAS
      .filter((p) => TECNICOS.some((t) => p.resposta.includes(t)))
      .map((p) => p.id);
    expect(vazando).toEqual([]);
  });
});
```

- [ ] **Passo 3: rodar e ver falhar**

Rode: `npx vitest run src/lib/faq.test.ts`
Esperado: FALHA — `Cannot find module './faq.ts'`

- [ ] **Passo 4: implementar o carregador**

Crie `src/lib/faq.ts`:

```ts
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
 * obrigação. Uma criança lendo "a catraca baixa aumenta o contato" merece
 * saber se isso saiu de um regulamento ou da experiência de quem joga.
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
```

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/lib/faq.test.ts`
Esperado: PASSA, 7 testes.

- [ ] **Passo 6: commitar**

```bash
npm test && npx tsc --noEmit
git add -A
git commit -m "feat(faq): formato do conteudo, com validacao e teste de integridade"
```

---

## Task 3: As três perguntas que saem dos nossos dados

**Arquivos:**
- Modificar: `data/faq.json`

**Interfaces:**
- Consome: o formato da Task 2. Nenhum código novo.

- [ ] **Passo 1: acrescentar as três perguntas**

Acrescente ao array `perguntas` de `data/faq.json`, depois de `quantas-pecas`:

```json
{
  "id": "starter-booster-random",
  "grupo": "comprar",
  "pergunta": "O que é um Starter? E um Booster? E um Random Booster?",
  "resposta": "São jeitos diferentes de vender o mesmo tipo de brinquedo.\n\nO Starter vem com o bey e o lançador junto. É o que você compra quando ainda não tem lançador nenhum.\n\nO Booster vem só com o bey, sem lançador. Custa menos, e serve para quem já tem.\n\nO Random Booster é uma caixa fechada: você não sabe qual bey está lá dentro. Costumam ser seis opções, e elas não têm a mesma chance de sair — numa caixa grande de 24, tem bey que aparece 3 vezes e tem bey que aparece 8.\n\nO Deck Set traz três beys de uma vez, para você já ter com o que trocar entre uma batalha e outra.",
  "origem": "dados",
  "fonte": null,
  "cita_pecas": [],
  "cita_beys": ["BX-01", "BX-14"]
},
{
  "id": "o-que-e-raro",
  "grupo": "comprar",
  "pergunta": "O que faz um beyblade ser raro?",
  "resposta": "O quanto ele é difícil de conseguir — só isso.\n\nSe você entra na loja, compra a caixa e sabe o que vem dentro, ele é comum. A maioria é assim.\n\nSe ele vem num Random Booster, depende de quantos aparecem. Um bey que sai 3 vezes numa caixa de 24 é muito raro. Outro, da mesma caixa, que sai 8 vezes, é só incomum.\n\nE tem os exclusivos, que nunca estiveram numa prateleira: prêmio de torneio, encomenda pelo correio, versão de uma loja só.\n\nCada bey difícil no catálogo explica na própria ficha por que é difícil, com o número.",
  "origem": "dados",
  "fonte": null,
  "cita_pecas": [],
  "cita_beys": ["BX-14"]
},
{
  "id": "o-que-esperar-de-cada-tipo",
  "grupo": "montar",
  "pergunta": "O que esperar de um bey de Ataque, Defesa, Resistência ou Equilíbrio?",
  "resposta": "Ataque bate para jogar o outro para fora do estádio. Ganha rápido — ou perde rápido, porque gasta a própria força em cada batida.\n\nDefesa aguenta a pancada sem sair do lugar. Dificilmente derruba alguém, mas é difícil de derrubar.\n\nResistência gira parado, economizando. Ganha quando o outro cansa primeiro.\n\nEquilíbrio não é o melhor em nada e não é ruim em nada. Serve quando você não sabe o que o adversário vai trazer.\n\nUma coisa que vale saber: um bey de ataque contra um de resistência costuma ser decidido pelo tempo. Se o ataque não derrubar logo, ele mesmo para antes.",
  "origem": "dados",
  "fonte": null,
  "cita_pecas": [],
  "cita_beys": []
}
```

> A última frase de `o-que-esperar-de-cada-tipo` descreve uma consequência dos
> próprios atributos — ataque alto vem com resistência baixa nos dados que
> temos —, e não uma regra de jogo. Se o usuário discordar dela na revisão, ela
> sai: é a única frase deste plano que chega perto de estratégia.

- [ ] **Passo 2: rodar os testes**

Rode: `npm test`
Esperado: PASSA. Os testes de integridade conferem que `BX-01` e `BX-14` existem.

- [ ] **Passo 3: commitar**

```bash
git add data/faq.json
git commit -m "content(faq): as tres perguntas que saem dos nossos proprios dados"
```

---

## Task 4: As duas perguntas da wiki

**Arquivos:**
- Modificar: `data/faq.json`

**Interfaces:**
- Consome: o formato da Task 2.

- [ ] **Passo 1: acrescentar as duas perguntas**

```json
{
  "id": "regras-da-batalha",
  "grupo": "o-jogo",
  "pergunta": "Quais são as regras de uma batalha?",
  "resposta": "Os dois lançam ao mesmo tempo no estádio, e cada jeito de vencer vale um tanto de pontos.\n\nXtreme Finish vale 3 pontos, e é a jogada que mais vale. O estádio oficial tem três saídas num dos lados: a do meio é mais larga e se chama Xtreme Zone. Jogar o bey do adversário por ali é um Xtreme Finish.\n\nOver Finish vale 2 pontos. É quando o bey do outro sai por uma das duas saídas de canto, chamadas Over Zone.\n\nBurst Finish vale 2 pontos. É quando a batida é tão forte que o bey do adversário se desmonta e as peças se separam no ar.\n\nE se ninguém sair do estádio nem se desmontar, decide quem ainda está girando quando o outro para.",
  "origem": "wiki",
  "fonte": "https://beyblade.fandom.com/wiki/Xtreme_Stadium",
  "cita_pecas": [],
  "cita_beys": []
},
{
  "id": "o-que-e-xtreme-dash",
  "grupo": "o-jogo",
  "pergunta": "O que é o Xtreme Dash?",
  "resposta": "É o truque do estádio oficial, e explica por que alguns beys correm de repente.\n\nNuma das laterais do estádio tem uma trilha com engrenagens, chamada Xtreme Line. Algumas Pontas também têm engrenagens embaixo.\n\nQuando a ponta do seu bey passa por essa trilha, as engrenagens se encaixam e o bey acelera. Isso é o Xtreme Dash.\n\nÉ por isso que existe ponta com Gear no nome — Gear Flat, Gear Ball, Gear Point. São as que aproveitam a trilha.",
  "origem": "wiki",
  "fonte": "https://beyblade.fandom.com/wiki/Xtreme_Dash",
  "cita_pecas": ["Gear Flat", "Gear Ball", "Gear Point"],
  "cita_beys": []
}
```

- [ ] **Passo 2: rodar os testes**

Rode: `npm test`
Esperado: PASSA. O teste confere que as três pontas Gear existem e que as duas respostas têm `fonte`.

Se alguma das três pontas não existir com esse nome exato, o teste falha com o nome no erro — conserte o `cita_pecas` conforme o catálogo, não o contrário.

- [ ] **Passo 3: commitar**

```bash
git add data/faq.json
git commit -m "content(faq): regras da batalha e Xtreme Dash, com fonte na wiki"
```

---

## Task 5: Os números que se calculam sozinhos

Uma resposta que diz "existem quatro tipos" e para é um texto morto. A que mostra *quantos dos 159 beys são de cada tipo* responde melhor e não tem como ficar velha.

**Arquivos:**
- Criar: `src/components/NumerosDoCatalogo.tsx`

**Interfaces:**
- Consome: `useCatalog` de `src/hooks/useCatalog.ts`; `ROTULO_TIPO`, `COR_TIPO`, `ROTULO_RARIDADE`, `COR_RARIDADE` de `src/components/rotulos.ts`
- Produz: `<DistribuicaoPorTipo />`, `<DistribuicaoPorRaridade />`

- [ ] **Passo 1: criar o componente**

```tsx
import { useMemo } from "react";
import { T } from "../theme.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { ROTULO_TIPO, COR_TIPO, ROTULO_RARIDADE, COR_RARIDADE } from "./rotulos.ts";
import type { Database } from "../types/database.ts";

type BeyType = Database["public"]["Enums"]["bey_type"];
type Rarity = Database["public"]["Enums"]["rarity"];

/**
 * Contagens do catálogo, calculadas na hora.
 *
 * Escrever "61 beys são de ataque" no texto do FAQ garantiria que o número
 * ficasse errado na primeira vez que o catálogo crescesse. Estes componentes
 * são o que permite ao FAQ mostrar número sem prometer manutenção manual.
 */
function Linha({ rotulo, valor, total, cor }: {
  rotulo: string; valor: number; total: number; cor: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
      <span style={{ width: 96, fontSize: 12.5, color: T.textSecondary }}>{rotulo}</span>
      <span style={{ flex: 1, height: 7, background: T.bgInput, borderRadius: 4 }}>
        <span style={{
          display: "block", height: "100%", borderRadius: 4, background: cor,
          width: total > 0 ? `${(valor / total) * 100}%` : 0,
        }} />
      </span>
      <span style={{ width: 34, textAlign: "right", fontSize: 12.5, color: T.textPrimary }}>
        {valor}
      </span>
    </div>
  );
}

export function DistribuicaoPorTipo() {
  const { composicoes, loading } = useCatalog();

  const contagem = useMemo(() => {
    const m = new Map<BeyType, number>();
    for (const c of composicoes) {
      const t = c.lancamentos[0]?.bey_type;
      if (t) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [composicoes]);

  if (loading) return null;
  const total = contagem.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ margin: "12px 0 4px" }}>
      {contagem.map(([tipo, n]) => (
        <Linha key={tipo} rotulo={ROTULO_TIPO[tipo]} valor={n} total={total}
               cor={COR_TIPO[tipo]} />
      ))}
      <p style={{ color: T.textMuted, fontSize: 11.5, margin: "6px 0 0" }}>
        {total} composições no catálogo, agora.
      </p>
    </div>
  );
}

export function DistribuicaoPorRaridade() {
  const { composicoes, loading } = useCatalog();

  const contagem = useMemo(() => {
    const ordem: Rarity[] = ["common", "uncommon", "rare", "very_rare", "exclusive"];
    return ordem
      .map((r) => [r, composicoes.filter((c) => c.raridade === r).length] as const)
      .filter(([, n]) => n > 0);
  }, [composicoes]);

  if (loading) return null;
  const total = contagem.reduce((s, [, n]) => s + n, 0);

  return (
    <div style={{ margin: "12px 0 4px" }}>
      {contagem.map(([r, n]) => (
        <Linha key={r} rotulo={ROTULO_RARIDADE[r]} valor={n} total={total}
               cor={COR_RARIDADE[r]} />
      ))}
    </div>
  );
}
```

- [ ] **Passo 2: verificar tipos**

Rode: `npx tsc --noEmit`
Esperado: sem erro.

- [ ] **Passo 3: commitar**

```bash
npm test && npx tsc --noEmit
git add src/components/NumerosDoCatalogo.tsx
git commit -m "feat(faq): contagens do catalogo calculadas, para o texto nao envelhecer"
```

---

## Task 6: A página do FAQ

**Arquivos:**
- Criar: `src/components/Faq.tsx`
- Modificar: `src/main.tsx` (rota `/faq`)
- Modificar: `src/App.tsx` (link no cabeçalho)

**Interfaces:**
- Consome: `PERGUNTAS`, `GRUPOS`, `ROTULO_GRUPO` da Task 2; `DistribuicaoPorTipo` e `DistribuicaoPorRaridade` da Task 5; `useCatalog`

- [ ] **Passo 1: criar a página**

```tsx
import { Link } from "react-router-dom";
import { T } from "../theme.ts";
import { PERGUNTAS, GRUPOS, ROTULO_GRUPO } from "../lib/faq.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { DistribuicaoPorTipo, DistribuicaoPorRaridade } from "./NumerosDoCatalogo.tsx";
import type { Pergunta } from "../lib/faq.ts";

/** Respostas que embutem um número calculado, e qual. */
const EMBUTE: Record<string, () => JSX.Element> = {
  "o-que-esperar-de-cada-tipo": DistribuicaoPorTipo,
  "o-que-e-raro": DistribuicaoPorRaridade,
};

const CREDITO: Record<Pergunta["origem"], string | null> = {
  dados: null,
  wiki: "Regra oficial",
  jogador: "Experiência de quem joga",
};

function Resposta({ p }: { p: Pergunta }) {
  const { composicoes, pecas } = useCatalog();

  const idDaPeca = (nome: string) => pecas.find((x) => x.name === nome)?.id;
  const idDoBey = (codigo: string) =>
    composicoes.flatMap((c) => c.lancamentos).find((b) => b.release_code === codigo)?.id;

  const Extra = EMBUTE[p.id];

  return (
    <article id={p.id} style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "15px 17px", marginBottom: 12,
    }}>
      <h3 style={{ margin: "0 0 9px", fontSize: 16 }}>{p.pergunta}</h3>

      {p.resposta.split("\n\n").map((par, i) => (
        <p key={i} style={{
          margin: "0 0 9px", color: T.textSecondary, fontSize: 14, lineHeight: 1.65,
        }}>{par}</p>
      ))}

      {Extra && <Extra />}

      {(p.cita_pecas.length > 0 || p.cita_beys.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {p.cita_pecas.map((nome) => {
            const id = idDaPeca(nome);
            return id ? (
              <Link key={nome} to={`/peca/${id}`} style={{
                background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: "3px 9px", fontSize: 12.5, color: T.accentDim,
                textDecoration: "none",
              }}>{nome}</Link>
            ) : null;
          })}
          {p.cita_beys.map((codigo) => {
            const id = idDoBey(codigo);
            return id ? (
              <Link key={codigo} to={`/bey/${id}`} style={{
                background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6,
                padding: "3px 9px", fontSize: 12.5, color: T.accentDim,
                textDecoration: "none",
              }}>{codigo}</Link>
            ) : null;
          })}
        </div>
      )}

      {(CREDITO[p.origem] || p.fonte) && (
        <p style={{ color: T.textMuted, fontSize: 11.5, margin: "10px 0 0" }}>
          {CREDITO[p.origem]}
          {p.fonte && (
            <>
              {CREDITO[p.origem] && " · "}
              <a href={p.fonte} style={{ color: T.accentDim }}>fonte</a>
            </>
          )}
        </p>
      )}
    </article>
  );
}

export default function Faq() {
  return (
    <section>
      <h2 style={{ margin: "0 0 4px", fontSize: 22 }}>Entender o jogo</h2>
      <p style={{ color: T.textMuted, fontSize: 13.5, margin: "0 0 20px" }}>
        O básico de Beyblade X, em {PERGUNTAS.length} perguntas.
      </p>

      {GRUPOS.map((g) => {
        const doGrupo = PERGUNTAS.filter((p) => p.grupo === g);
        if (!doGrupo.length) return null;
        return (
          <div key={g} style={{ marginBottom: 24 }}>
            <h3 style={{
              margin: "0 0 10px", fontSize: 13, color: T.textMuted,
              textTransform: "uppercase", letterSpacing: 0.6,
            }}>{ROTULO_GRUPO[g]}</h3>
            {doGrupo.map((p) => <Resposta key={p.id} p={p} />)}
          </div>
        );
      })}
    </section>
  );
}
```

Repare no fim do cabeçalho: `{PERGUNTAS.length} perguntas`. O número não é escrito.

- [ ] **Passo 2: registrar a rota e o link**

Em `src/main.tsx`, com `import Faq from "./components/Faq.tsx";`:

```tsx
              <Route path="/faq" element={<Faq />} />
```

Em `src/App.tsx`, ao lado do link do Laboratório, nos DOIS ramos do cabeçalho (o de visitante e o de quem entrou):

```tsx
<Link to="/faq" style={{ color: T.accentDim, fontSize: 13 }}>Entender o jogo</Link>
```

- [ ] **Passo 3: verificar no navegador**

```bash
npm run dev
```

Em `http://localhost:5173/faq`:
- as 6 perguntas aparecem, agrupadas
- a resposta sobre tipos mostra as barras com a contagem real
- a resposta sobre raridade mostra os degraus
- as pontas Gear viram link e levam à ficha da peça
- as respostas da wiki mostram "Regra oficial · fonte"

- [ ] **Passo 4: commitar**

```bash
npm test && npx tsc --noEmit && npm run build
git add -A
git commit -m "feat(faq): pagina do FAQ, com peca citada virando link"
```

---

## Task 7: A landing

**Arquivos:**
- Criar: `src/components/UltimosLancamentos.tsx`
- Modificar: `src/components/Landing.tsx` (substitui a versão provisória da Task 1)

**Interfaces:**
- Consome: `useCatalog`; `destinoDaRaiz` da Task 1; `PERGUNTAS` da Task 2; `urlImagem` de `src/lib/imagens.ts`
- Produz: `<UltimosLancamentos limite={n} />`

- [ ] **Passo 1: o bloco de lançamentos recentes**

Crie `src/components/UltimosLancamentos.tsx`:

```tsx
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { T } from "../theme.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { urlImagem } from "../lib/imagens.ts";

/**
 * Os últimos produtos por data de lançamento.
 *
 * Sai do catálogo que a página já carrega — nenhuma consulta a mais, nenhuma
 * infraestrutura de notícias. Foi para viabilizar este bloco que as datas de
 * lançamento foram completadas de 13 para 154 dos 159 beys.
 *
 * Bey sem data fica de fora: sem data não há como ordenar, e inventar uma
 * colocaria um produto antigo no topo.
 */
export default function UltimosLancamentos({ limite = 6 }: { limite?: number }) {
  const { composicoes, loading } = useCatalog();

  const recentes = useMemo(() => {
    return composicoes
      .map((c) => ({
        comp: c,
        bey: [...c.lancamentos]
          .filter((l) => l.release_date)
          .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))[0],
      }))
      .filter((x): x is { comp: typeof x.comp; bey: NonNullable<typeof x.bey> } =>
        Boolean(x.bey))
      .sort((a, b) => (b.bey.release_date ?? "").localeCompare(a.bey.release_date ?? ""))
      .slice(0, limite);
  }, [composicoes, limite]);

  if (loading || !recentes.length) return null;

  return (
    <div style={{
      display: "grid", gap: 10,
      gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    }}>
      {recentes.map(({ comp, bey }) => (
        <Link key={comp.chave} to={`/bey/${bey.id}`} style={{
          textDecoration: "none", color: "inherit",
          background: T.bgCard, border: `1px solid ${T.border}`,
          borderRadius: 9, overflow: "hidden",
        }}>
          <div style={{
            aspectRatio: "16 / 9",
            background: "linear-gradient(140deg, #ffffff, #e8ecf1 70%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {urlImagem(bey.image_path) && (
              <img src={urlImagem(bey.image_path)!} alt={comp.nome} loading="lazy"
                   style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            )}
          </div>
          <div style={{ padding: "8px 10px 10px" }}>
            <div style={{ color: T.textMuted, fontSize: 11 }}>
              {bey.release_code} · {bey.release_date?.slice(0, 7)}
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{comp.nome}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Passo 2: a landing completa**

Substitua `src/components/Landing.tsx`:

```tsx
import { Link, Navigate, useLocation } from "react-router-dom";
import { T } from "../theme.ts";
import { destinoDaRaiz } from "../lib/rotas.ts";
import { useCatalog } from "../hooks/useCatalog.ts";
import { PERGUNTAS } from "../lib/faq.ts";
import UltimosLancamentos from "./UltimosLancamentos.tsx";

/** Três perguntas escolhidas para quem chega sem saber nada. */
const PRIMEIRAS = ["quantas-pecas", "o-que-esperar-de-cada-tipo", "regras-da-batalha"];

function Caminho({ para, titulo, detalhe }: {
  para: string; titulo: string; detalhe: string;
}) {
  return (
    <Link to={para} style={{
      textDecoration: "none", color: "inherit",
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: "15px 17px", display: "block",
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.accent }}>{titulo}</div>
      <div style={{ color: T.textSecondary, fontSize: 13.5, marginTop: 4 }}>{detalhe}</div>
    </Link>
  );
}

export default function Landing() {
  const { search } = useLocation();
  const destino = destinoDaRaiz(search);
  const { composicoes, pecas, totalProdutos } = useCatalog();

  // Antes de qualquer outra coisa: link antigo vai para onde foi feito para ir.
  if (destino) return <Navigate to={destino} replace />;

  return (
    <section>
      <p style={{ color: T.textSecondary, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" }}>
        Todo Beyblade X que saiu, peça por peça — e um laboratório para você montar
        combinações e ver o que esperar delas <strong>antes</strong> de comprar.
      </p>

      <div style={{
        display: "grid", gap: 12, marginBottom: 28,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}>
        <Caminho para="/catalogo" titulo="Catálogo"
                 detalhe={totalProdutos
                   ? `${totalProdutos} produtos, ${pecas.length} peças`
                   : "Todos os beys, peça por peça"} />
        <Caminho para="/lab" titulo="Laboratório"
                 detalhe="Monte e veja o resultado antes de comprar" />
        <Caminho para="/faq" titulo="Entender o jogo"
                 detalhe={`O básico em ${PERGUNTAS.length} perguntas`} />
      </div>

      {composicoes.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>O que saiu recentemente</h3>
          <UltimosLancamentos limite={6} />
        </div>
      )}

      <div>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>Comece por aqui</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {PRIMEIRAS.map((id) => {
            const p = PERGUNTAS.find((x) => x.id === id);
            return p ? (
              <Link key={id} to={`/faq#${id}`} style={{
                textDecoration: "none", color: T.textSecondary, fontSize: 14,
                background: T.bgCard, border: `1px solid ${T.border}`,
                borderRadius: 9, padding: "11px 14px",
              }}>{p.pergunta}</Link>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}
```

`PRIMEIRAS` guarda ids, e o `.find` devolve `null` quando um id não existe: se uma pergunta for renomeada, o bloco encolhe em vez de quebrar a página.

- [ ] **Passo 3: verificar no navegador**

```bash
npm run dev
```

- `/` mostra a landing com os três caminhos e os números reais
- "O que saiu recentemente" traz os últimos, com arte — o mais recente deve ser de 2026-08
- as três perguntas de "Comece por aqui" levam ao FAQ
- `/?q=Keel+Shark` continua caindo em `/catalogo?q=Keel+Shark`
- no celular (largura de 375px) os blocos empilham sem estourar a largura

- [ ] **Passo 4: commitar**

```bash
npm test && npx tsc --noEmit && npm run build
git add -A
git commit -m "feat(landing): porta de entrada com os tres caminhos e os ultimos lancamentos"
```

---

## Autorrevisão

**Cobertura da spec:**

| Seção da spec | Onde |
|---|---|
| §2 Rotas e redirecionamento | Task 1 |
| §3 A landing (4 blocos) | Task 7 |
| §4.1 Onde o conteúdo mora | Task 2 |
| §4.2 Formato | Task 2 |
| §4.3 `origem` | Task 2 (schema) e Task 6 (crédito na tela) |
| §5 Números calculados | Task 5, usados na Task 6 e na Task 7 |
| §6.1 As 4 perguntas dos nossos dados | Task 2 (`quantas-pecas`) e Task 3 (as outras 3) |
| §6.2 As 2 perguntas da wiki | Task 4 |
| §6.3 As 2 que esperam o usuário | Deliberadamente ausentes — ver "O que este plano NÃO entrega" |
| §7 Testes | Task 1 (rotas) e Task 2 (FAQ) |
| §8 Fora de escopo | Nenhuma tarefa, como esperado |

**Consistência de tipos:** `Pergunta`, `Grupo` e `Origem` são definidos na Task 2 e usados com o mesmo nome nas Tasks 3, 4, 6 e 7. `destinoDaRaiz` (Task 1) é consumido pela Landing nas Tasks 1 e 7. `DistribuicaoPorTipo` e `DistribuicaoPorRaridade` (Task 5) são consumidos pelo mapa `EMBUTE` da Task 6.

**Um ponto que a execução precisa conferir:** a Task 4 cita as pontas `Gear Flat`, `Gear Ball` e `Gear Point` pelo nome. Elas aparecem no seletor do laboratório, mas o teste é quem confirma — se o nome no catálogo for outro, o teste falha com o nome no erro, e o `cita_pecas` é que se ajusta.
