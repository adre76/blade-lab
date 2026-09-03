# Onda CX — a Custom Line, e o que ficou para trás

> A quarta linha do catálogo, e a primeira onda que mexe em `part_slot` e
> `anatomy` ao mesmo tempo. Fecha também três pendências registradas nas ondas
> 1 e 3.

## 1. Objetivo

O catálogo tem 159 beys e 171 peças, todos de duas linhas: BX e UX. A Custom
Line está **declarada** desde a Onda 0 — `custom` e `custom_expand` existem em
`data/anatomies.json`, e cinco valores de `part_slot` existem no enum — e não
tem **nenhuma peça**. Os denominadores de normalização dessas duas anatomias
são zero, e `normalizar` devolve 0 para eles.

Esta onda preenche isso, e aproveita a mesma passada de coleta para fechar as
pendências que sobraram das ondas anteriores.

### 1.1 O que entra

| Frente | Volume |
|---|---|
| Beys CX | 47 páginas na categoria `Custom Line Beyblades` (TT + Hasbro, a filtrar) |
| Peças CX | ~78 — 28 Lock Chips, 16 Main Blades, ~18 Assist Blades, 7 Metal Blades, 7 Over Blades, a catraca `5-50`, a ponta `Yielding` |
| Ratchet-Integrated Bits | 2 peças (`Operate`, `Turbo`) e uma anatomia nova |
| Ratchet-Integrated Blades pendentes | 4 (`Cutter Shinobi`, `Rampart Aegis`, `Valor Bison`, `Seize Jaguar`) |
| Lightning L-Drago | 2 lâminas e os beys BX-00 correspondentes |

A CX acrescenta pouquíssima catraca e ponta — uma de cada. O volume está nas
quatro classes de peça novas.

### 1.2 Por que as três frentes numa onda só

Todas são "o que falta no catálogo", e todas saem da mesma passada sobre a
mesma wiki. Cada uma é uma seção própria deste documento e um grupo próprio de
tarefas no plano, de modo que cortar uma não derruba as outras.

## 2. A coleta

### 2.1 Um coletor versionado, e não mais um script de scratchpad

As ondas 0 a 3 coletaram de forma ad-hoc: scripts efêmeros, só o JSON
resultante commitado. O preço apareceu cinco vezes, e sempre do mesmo jeito —
uma regra de derivação que morava só no raciocínio de quem coletou:

| Defeito | Regra silenciosa que o causou |
|---|---|
| 3 lâminas renomeadas ao contrário | "o título da página é o nome Takara Tomy" |
| Anatomia errada em 16 beys | "a anatomia sai do prefixo do código" |
| `release_type` errado em 8 beys | uma regex sobre a prosa da página |
| Beys duplicados | comparar contra o arquivo, não contra a coleção |
| 4 nomes de bey inventados | "repintura reusa o nome do original" |

Nenhum deles foi pego por revisão de código, porque não havia código para
revisar; todos foram pegos rodando alguma coisa e lendo a saída.

Há um argumento mais forte, e ele apareceu durante a pesquisa desta onda: **os
stats do Lightning L-Drago foram publicados na wiki DEPOIS do descarte da Onda
1**. A fonte muda. Sem coletor, recoletar é arqueologia de conversa; com
coletor, é um comando.

`scripts/coletar.ts` lê a wiki e escreve `data/`. **Não escreve no banco** —
quem semeia continua sendo `seed.ts`, e manter a separação significa que a
coleta pode rodar quantas vezes for preciso sem risco de escrita.

### 2.2 Falhar alto

Todo defeito da tabela acima foi uma adivinhação silenciosa. O coletor recusa e
reporta, em vez de escolher, quando:

1. O conjunto de campos de peça do infobox não casa com **nenhuma** anatomia
   conhecida.
2. Uma peça citada por um bey não aparece na lista de peças da linha.
3. O sentido de giro derivado das peças diverge do `SpinDirection` declarado
   pelo bey.

O item 3 é o mais valioso: é a única verificação cruzada disponível para a
regra de giro na CX, e ela nunca foi exercitada (ver §5.3).

### 2.3 A anatomia sai dos campos do infobox

A regra que a Onda 1 usava — ler o campo `System` — é frágil, e a pesquisa
mostrou por quê: o `System2`, que distingue o Expand Blade, também carrega
`X-Over Project` nos beys de colaboração. Testar a *presença* do campo daria
anatomia errada para o Lightning L-Drago.

A regra nova lê **quais campos de peça o infobox declara**:

```
DranSword 3-60F   → BladeX, Ratchet, Bit                              basic
GloryValkyrie LF  → (lâmina integrada), Bit                           unique_expand
PegasusBlast ATr  → LockChip, MainBlade, AssistBlade, RatchetBit      custom_integrated
DranBrave S6-60V  → LockChip, MainBlade, AssistBlade, Ratchet, Bit    custom
BahamutBlitz BK…  → LockChip, OverBlade, MetalBlade, AssistBlade,
                    Ratchet, Bit                                      custom_expand
```

É a mesma informação que `data/anatomies.json` já guarda, lida do outro lado.
`System` vira conferência: se os campos dizem `custom` e o `System` diz
`Basic Line`, o coletor para.

## 3. Lock Chip: uma peça que não pontua

Verificado nas 28 páginas: **nenhuma tem `AttackStat`, `DefenseStat`,
`StaminaStat` nem `Type`**. Os campos existem no infobox e estão vazios. Não é
lacuna de documentação — é a classe. O Lock Chip prende a Main Blade na Assist
Blade; ele não é ponto de contato.

O peso, esse existe e **varia**: 1,7 g nos comuns e 4,7 g / 5,6 g nos Metal
Lock Chips, que têm metal embutido.

**Decisão.** No banco fica `0`, que já é o default das colunas — não vale uma
migração para tornar três colunas anuláveis e mexer em todo consumidor. A
diferença é de **exibição**: um conjunto `SLOTS_SEM_PONTUACAO` faz a ficha da
peça e o bloco "de onde vem cada número" mostrarem *não pontua* no lugar de
`ATQ 0 · DEF 0 · RES 0`.

O conjunto mora em `src/components/rotulos.ts`, junto das outras tabelas de
apresentação, e **não** no motor: o motor soma zero corretamente e não precisa
saber disso. É uma regra de como se conta a coisa ao leitor, não de cálculo.

O peso continua entrando na soma normalmente, porque é um número real.

A razão de não deixar os zeros aparecerem: um card com três zeros diz "peça
ruim". O Lock Chip não é ruim, ele é de outra natureza — e um catálogo que
mostra o número certo com o sentido errado erra do mesmo jeito.

## 4. Altura

O Assist Blade traz `HeightStat` (50, 60 nos exemplos vistos). É a segunda
classe de peça a carregar altura, além da catraca.

**Decisão.** A altura do combo continua sendo a da **catraca** — ou, onde não
houver catraca separada, a da peça que a traz embutida (`integrated_blade`,
`integrated_bit`), que é a regra que `SLOTS_DE_ALTURA` já expressa. O nome do
produto declara isso: em `S6-60V`, o `60` é a catraca `6-60`. A altura do
Assist Blade é gravada na peça, aparece na ficha dela, e **não entra em soma
nenhuma**.

Duas razões. A altura não alimenta cálculo algum hoje — é exibição —, então
somar não melhora resposta nenhuma. E a soma seria um número que a fonte não
publica: a wiki dá a altura da catraca e a do Assist Blade separadamente, e não
diz que a altura do bey é a soma das duas.

O comentário da coluna `parts.height_mm` diz "apenas ratchets" e passa a estar
errado; é corrigido na migração.

## 5. A anatomia nova

### 5.1 O que é

`PegasusBlast ATr` é `System=Custom Line` e declara `LockChip`, `MainBlade`,
`AssistBlade` e **`RatchetBit=Turbo`** — sem catraca separada. São quatro
slots. `EmperorMight HOp` tem a mesma forma.

Ou seja: a ponta-com-catraca **não é uma anatomia da BX**, como eu supunha
antes de ler as páginas. É uma variante da CX em que catraca e ponta são uma
peça só — irmã da `unique_expand` pelo lado de baixo do bey.

### 5.2 Nome

Um valor novo em `part_slot`, **`integrated_bit`**, espelhando o
`integrated_blade` que já existe.

Um valor novo em `anatomy`, **`custom_integrated`**. Este nome é **inventado**:
a wiki dá nome ao "Expand Blade" e não dá nome nenhum a esta variante. Fica
registrado aqui que é cunhagem nossa, para ninguém procurar a fonte depois.

```
custom_integrated : lock_chip, main_blade, assist_blade, integrated_bit
```

### 5.3 O giro na CX ainda não foi exercitado

Todas as peças CX declaram `Right-Spin`, inclusive os Lock Chips — não há
nenhuma peça CX canhota publicada. Então a regra atual do motor
(`blade → integrated_blade → main_blade → metal_blade`) **não pode ser
verificada contra um contraexemplo** na CX.

Fica como está, e a conferência do §2.2 item 3 é o que vai acusar se estiver
errada no dia em que sair uma CX canhota. Registrado aqui para não parecer
testado.

## 6. As pendências antigas

### 6.1 Lightning L-Drago — o descarte expirou

Descartadas na Onda 1 por não terem stats publicados. **Têm hoje**:
ATQ 55/25/20 (Upper Type) e 50/30/20 (Rapid-Hit Type), pesos 34,0 g e 33,5 g,
`System=Basic Line`, `System2=X-Over Project`, BX-00, Random Booster.

Entram como lâminas `basic` comuns. Um detalhe: são `Left-Spin`, e serão as
**primeiras lâminas canhotas do catálogo** — exercitam um caminho que existe no
schema e nunca teve dado.

### 6.2 Ratchet-Integrated Blades

Sete no total; três já estão no catálogo (`BulletGriffon`, `GloryValkyrie`,
`HellsNether`). Das quatro que faltam, três entram sem cerimônia:
`Cutter Shinobi`, `Rampart Aegis` e `Valor Bison`, todas Hasbro, todas com
stats publicados.

### 6.3 `Seize Jaguar` — fonte que não publica

A quarta não tem stats. Isso é um terceiro estado, diferente dos dois que o
modelo conhece: não é "as fontes divergem" (`data_disputed`) nem "o dado é
zero".

**Decisão.** Entra com zeros, `data_disputed = true` e a razão em `notes`,
alargando o sentido da coluna de "as fontes divergem" para **"este registro
precisa de revisão"** — que é o que o índice parcial `parts_disputed_idx` já
significa na prática, já que ele existe para responder *o que precisa de
revisão*. O comentário da coluna é atualizado na migração para dizer isso.

Uma linha não justifica coluna nova. Se aparecer uma terceira situação, aí sim.

### 6.4 Stats de dois modos

Algumas peças publicam dois conjuntos: `30 > 55`, `20/50`, `50/70`. São modos
de montagem ou de Xtreme Dash.

Já existe precedente no catálogo, do Hells Nether: grava-se o **primeiro**
valor e explica-se os dois em `notes`, sem `data_disputed` — a fonte não está
em conflito consigo mesma, ela está descrevendo dois estados. O coletor reusa
essa regra e a aplica sozinho quando encontrar as notações `>` ou `/`.

## 7. Migrações

`0017_custom_line.sql`:

- `alter type part_slot add value 'integrated_bit'`
- `alter type anatomy add value 'custom_integrated'`
- comentário de `parts.height_mm`: deixa de dizer "apenas ratchets"
- comentário de `parts.data_disputed`: passa a cobrir "a fonte não publica"

`alter type ... add value` não roda dentro de transação; a migração `0014`
já lidou com isso e serve de modelo.

`anatomy_slots` recebe a linha nova por `scripts/sync-anatomies.ts`, a partir
de `data/anatomies.json` — o mesmo caminho da `unique_expand`.

## 8. Motor

Três mudanças, todas pequenas:

- `SLOTS_DE_BURST` ganha `integrated_bit`. Numa `custom_integrated` não há
  catraca nem ponta separadas: a peça é as duas, então é ela sozinha que decide
  a retenção, e o mínimo é tirado sobre um valor só.
- `SLOTS_DE_ALTURA` ganha `integrated_bit`, pela mesma razão — é a única peça
  do combo que carrega altura.
- `ORDEM_GIRO` **não muda**: já cita `main_blade` e `metal_blade`.

O `SLOTS_DE_BURST` já exclui o Lock Chip de propósito, com o comentário
explicando por quê. Continua correto.

### 8.1 O seletor de anatomia não muda

`anatomiasMontaveis` deriva as opções do catálogo carregado: uma anatomia
aparece quando **todas** as suas peças existem. As anatomias CX vão aparecer
sozinhas no laboratório quando as peças entrarem, sem uma linha de código.

O teste `a CX entra sozinha quando as peças dela chegarem` já existe e passa
com peças sintéticas. O que esta onda faz é torná-lo verdadeiro com dado real —
e a verificação é abrir `/lab` e ver as opções novas na lista.

## 9. Interface

`ROTULO_SLOT` deixou os slots da CX em inglês, com o comentário *"ficam em
inglês até a onda da CX: traduzir nome de peça que ninguém consegue ver ainda
seria decidir no escuro"*. É esta onda. Entram as traduções de Lock Chip, Main
Blade, Assist Blade, Metal Blade, Over Blade e `integrated_bit`.

`BUSCA_SLOT` recebe os **dois idiomas** de cada uma, pela mesma razão de
catraca/ratchet: quem procura `main blade` tem de achar.

`ROTULO_ANATOMIA` recebe `custom_integrated`.

## 10. Correção da spec principal

`docs/superpowers/specs/2026-08-31-blade-x-lab-design.md` §4.1 e §4.2 estão
desatualizadas: dão quatro slots à `unique` (com `assist_blade`) e não conhecem
`unique_expand`. A §5.1 já foi corrigida em 02/09, com nota de proveniência; a
§4 ficou para trás.

Como esta onda é exatamente sobre anatomias e slots, as duas seções são
corrigidas junto, com a mesma nota de proveniência.

## 11. Verificação

O que conta como pronto, além dos testes:

1. **Contagem por linha e anatomia** no banco: CX presente, `custom`,
   `custom_expand` e `custom_integrated` com beys.
2. **Zero peças órfãs**: toda peça citada por um bey existe; todo slot exigido
   pela anatomia está preenchido. É o que a FK composta e o trigger diferido já
   garantem — a verificação é que o seed passa.
3. **`/lab` abre com as anatomias CX na lista**, e uma montagem CX completa
   produz barras que não estouram 100%.
4. **Um Lock Chip na ficha mostra "não pontua"**, não três zeros.
5. **Uma lâmina canhota no catálogo** (Lightning L-Drago), com o giro correto
   na ficha do bey.
6. **`npm run obsoletos`** não lista nada de novo: a coleta não deve tornar
   obsoleto nada que já existia.

## 12. Fora de escopo

- **Batalha bey contra bey.** Continua reservada (§5.7 da spec principal), e
  continua precisando de calibração.
- **Imagens das peças CX.** `seed-images.ts` já sabe ler o campo de imagem do
  infobox; roda depois da coleta, como nas outras linhas, e não é decisão de
  design.
- **Traduzir os nomes próprios das peças.** `Main Blade - Brave` continua
  "Brave"; o que se traduz é o nome da **classe**, não o da peça.
