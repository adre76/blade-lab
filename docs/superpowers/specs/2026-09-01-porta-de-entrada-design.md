# Porta de entrada — landing page e FAQ

> Segunda frente da Onda 3. A primeira, o laboratório, está implementada e
> registrada em [`2026-09-02-onda-3-laboratorio.md`](../plans/2026-09-02-onda-3-laboratorio.md).

## 1. Objetivo

Hoje quem abre o Blade X Lab cai numa grade de 157 composições, sem nada que
diga o que o site é nem o que aqueles números significam. Esta frente resolve
as duas pontas do mesmo problema:

- **a landing** explica o que o site faz e encaminha
- **o FAQ** dá o vocabulário mínimo para ler o resto

As duas frentes da onda se sustentam. O laboratório responde *"o que esperar
desta combinação"*; a porta de entrada responde *"por que essa pergunta faz
sentido"*. Quem não sabe o que uma catraca alta muda não tem o que perguntar ao
laboratório.

### 1.1 O leitor

**Uma criança que já joga**, lendo sozinha no celular. Tem alguns beys, batalha
com amigos, mas nunca parou para entender por que um ganha do outro.

Isso fixa o registro de todo o texto desta frente: frase curta, nenhum jargão
usado antes de ser explicado, e exemplos com beys que ela provavelmente tem —
tirados do próprio catálogo, não inventados.

## 2. Rotas

| Rota | Antes | Depois |
|---|---|---|
| `/` | Catálogo | **Landing** |
| `/catalogo` | — | Catálogo, com busca e filtros |
| `/faq` | — | **FAQ** |
| `/lab`, `/bey/:id`, `/peca/:id`, `/inventario`, `/creditos` | | inalteradas |

### 2.1 Links já compartilhados não podem quebrar

Existem links apontando para `/?q=…`, `/?tipo=…`, `/?raridade=…` e `/?combo=…`.
Eles nasceram da decisão da Onda 1 de guardar busca e filtro na querystring
justamente para serem compartilháveis (spec principal §3.2) — quebrá-los agora
desmentiria aquela decisão.

**Regra:** `/` que chega com qualquer parâmetro de catálogo redireciona para
`/catalogo` preservando a querystring inteira. `/` sem parâmetro mostra a
landing.

O redirecionamento é permanente, não uma medida de transição: a querystring é
o sinal de que aquele link foi feito para o catálogo.

## 3. A landing

Quatro blocos, de cima para baixo, pensados para o celular:

1. **O que é isto.** Uma frase, e três caminhos, cada um com o número que o
   torna concreto em vez de promessa vaga:
   - *Catálogo* — 159 beys, 171 peças
   - *Laboratório* — monte e veja o resultado antes de comprar
   - *Entender o jogo* — o básico em 6 perguntas

   **Nenhum desses números é escrito no texto.** Os dois primeiros saem do
   catálogo carregado; o terceiro, do tamanho de `data/faq.json`. Escrevê-los
   à mão garantiria que ficassem errados na primeira vez que o catálogo
   crescesse.

2. **O que saiu recentemente.** Os últimos lançamentos por `release_date`, com
   a arte. Não exige infraestrutura nova: usa o `useCatalog`, que já carrega o
   catálogo inteiro. Foi para viabilizar este bloco que as datas de lançamento
   foram completadas (13 → 154 de 159).

3. **Comece por aqui.** Três perguntas do FAQ escolhidas para quem chega,
   com link para a resposta.

4. **Rodapé.** Créditos e procedência, que já existem em `/creditos`.

## 4. O FAQ

### 4.1 Onde o conteúdo mora

Em `data/faq.json`, no repositório, **importado direto pelo app** — como
`data/anatomies.json`, e diferente de `data/parts/*.json`.

A distinção importa: as peças vão para o banco porque o inventário e os combos
precisam referenciá-las por chave estrangeira. O FAQ não é referenciado por
nada; é texto que a tela lê. Passá-lo pelo banco criaria uma migration, uma
política de RLS e um passo de seed para ganhar nada — e tiraria o conteúdo do
lugar onde ele pode ser revisado num diff.

Foi escolhido sobre as alternativas (tabela no banco; Markdown importado no
build) por uma razão que as outras duas não oferecem: **um teste de integridade
pode verificar que toda peça citada numa resposta existe no catálogo**. Um FAQ
que menciona a ponta Rubber Accel e um dia ela sai do catálogo passa a quebrar
o teste, em vez de envelhecer calado. É a mesma razão que faz os dados do
catálogo morarem em arquivo versionado.

### 4.2 Formato

```json
{
  "id": "o-que-e-starter",
  "grupo": "comprar",
  "pergunta": "O que é um Starter? E um Random Booster?",
  "resposta": "…",
  "origem": "dados",
  "fonte": null,
  "cita_pecas": ["Dran Sword"],
  "cita_beys": ["BX-01"]
}
```

| Campo | Papel |
|---|---|
| `id` | Âncora de link. Único e estável — muda só se a pergunta mudar de assunto |
| `grupo` | `as-pecas`, `o-jogo`, `comprar`, `montar`. Ordena a página |
| `pergunta` | Como a criança perguntaria, não como um manual escreveria |
| `resposta` | Texto. Frases curtas |
| `origem` | `dados` · `wiki` · `jogador` — ver §4.3 |
| `fonte` | URL. Obrigatória quando `origem` é `wiki`, ausente nos outros casos |
| `cita_pecas` | Nomes de peça do catálogo. Viram link, e o teste confere que existem |
| `cita_beys` | Códigos de produto. Idem |

### 4.3 `origem`: de onde veio cada resposta

O catálogo exige `source_url` em todo registro. O FAQ carrega a mesma
obrigação, adaptada: **nenhuma resposta existe sem dizer de onde veio.**

- **`dados`** — deduzida do nosso próprio catálogo. *"O que define um bey como
  raro"* é a regra que a Onda 3 implementou: 3 de 24 numa caixa é mais raro que
  5 de 24. Verificável sem sair daqui.
- **`wiki`** — pesquisada na Beyblade Wiki, com `fonte` apontando para a
  página. É o caso das regras de batalha e do Extreme Dash.
- **`jogador`** — conhecimento prático de quem joga, escrito pelo usuário. A
  tela credita isso ao leitor, em vez de apresentar como fato apurado.

A distinção não é burocracia: uma criança lendo *"a catraca baixa aumenta o
contato"* merece saber se isso saiu de um regulamento ou da experiência de
alguém que joga.

## 5. O que faz este FAQ não ser texto morto

**Os números não são escritos — são calculados na hora, do catálogo.**

A resposta sobre tipos não diz "existem quatro tipos" e para. Ela mostra a
distribuição real dos 159 beys por natureza. A resposta sobre raridade mostra
os cinco degraus com a contagem de cada um. Peça citada vira link para a ficha,
onde a criança vê os atributos e onde conseguir aquela peça.

Um FAQ estático desatualiza em silêncio. Este quebra o teste quando o catálogo
muda, e os números que ele mostra não têm como ficar velhos.

## 6. As perguntas

O usuário levantou a lista. Elas se separam por **quem consegue respondê-las**,
e essa separação decide o que entra agora.

### 6.1 Respondo com os nossos dados (`origem: dados`)

| Pergunta | Do que sai |
|---|---|
| O que é um Starter? E um Random Booster? | `release_type` e a proporção por caixa levantada na Onda 3 |
| O que define um beyblade como raro? | A regra de raridade implementada: proporção, encomenda, prêmio de evento |
| O que esperar de cada tipo — ataque, defesa, resistência, equilíbrio? | Distribuição real de atributos por `part_type` nos 159 beys |
| Quantas peças tem um beyblade X? | `data/anatomies.json` — e a resposta muda por linha, incluindo o UX Expand Blade de duas peças |

### 6.2 Pesquiso na wiki (`origem: wiki`, com `fonte`)

| Pergunta |
|---|
| Quais as regras de uma batalha? Como se pontua? |
| O que é Extreme Dash? |

### 6.3 Esperam o texto do usuário (`origem: jogador`)

| Pergunta | Por que não posso escrever |
|---|---|
| O que cada parte muda no giro do bey? | Tenho a altura da catraca e os atributos; o **porquê** físico é conhecimento de quem joga |
| Por que um bey é de ataque ou de defesa? O que é feito para isso? | A mesma coisa por outro ângulo |

**Estas duas não entram até o texto existir.** Não publicamos pergunta com
resposta vazia nem inventamos o conteúdo — é a mesma regra que a spec principal
§5.7 impôs à simulação de batalha. O lugar delas fica pronto; elas aparecem
quando o texto chegar.

## 7. Testes

Em `src/lib/faq.test.ts`, **arquivo próprio**, e não dentro de
`src/lib/seed/integridade.test.ts`: aquele valida o que vai para o banco, e o
FAQ não vai. Misturá-los faria o teste do catálogo carregar dado que o seed
nunca vê.

O teste importa `data/faq.json` e as peças por `carregarPartes`, a mesma
função que o seed usa — é o que garante que "existe no catálogo" signifique a
mesma coisa nos dois lugares.

- toda peça em `cita_pecas` existe em `data/parts/`
- todo código em `cita_beys` existe em `data/beyblades/`
- `origem: "wiki"` exige `fonte`; `origem: "jogador"` e `"dados"` não a têm
- `id` único
- `grupo` é um dos quatro previstos
- nenhuma resposta cita nome de coluna do banco — o mesmo teste que já protege
  as notas do catálogo, estendido ao FAQ

A interface segue sem testes automatizados, como no resto do projeto.

## 8. Fora de escopo

**Notícias e o pipeline do n8n** → Onda 4, com spec próprio. Envolve
infraestrutura externa escrevendo no nosso banco, o que traz duas perguntas que
merecem desenho e não apêndice: qual credencial o n8n usa (dar `service_role` a
um sistema externo entrega a chave que ignora todo o RLS) e se texto de
terceiros vai ao ar sem alguém ler.

**Novidade de catálogo por coleta agendada.** Decidido que, quando existir, sai
de um GitHub Action rodando os scripts que já existem — o "que há de novo" é o
diff de `data/beyblades/*.json`, com procedência auditável em git. Não precisa
de n8n nem de tabela nova. Também Onda 4.

**Tradução por LLM.** Idem.
