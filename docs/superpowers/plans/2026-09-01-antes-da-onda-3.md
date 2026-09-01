# Antes da Onda 3 — pendências pedidas pelo usuário

Três itens combinados em 01/09/2026, para fazer **antes** do laboratório.

**Estado em 02/09/2026: os tres itens feitos.** O escopo da Onda 3 esta em [2026-09-02-onda-3-escopo.md](2026-09-02-onda-3-escopo.md).

---

## 1. Traduzir "Ratchet" e "Bit"

Pedido na sequência da troca de *Stamina* por *Resistência*.

### A diferença em relação ao caso do Stamina

*Stamina* era um **atributo** — palavra descritiva, com precedente direto da
Hasbro em português. *Ratchet* e *Bit* são **nomes de classe de peça**, e
aparecem na própria notação do produto: `3-60F` é ratchet `3-60` + bit `F`.

Mas o argumento de consistência é o mesmo, e é forte: *Blade* já virou
**Lâmina**. Hoje a ficha mostra `Lâmina / Ratchet / Bit`, uma em português e
duas em inglês.

### Recomendação

**Traduzir as duas, ou nenhuma.** Meio-termo (`Lâmina / Ratchet / Ponta`) fica
pior que qualquer um dos extremos.

Se traduzir:

| hoje | proposta | por quê |
|---|---|---|
| Ratchet | **Catraca** | tradução literal, e é o que a peça é |
| Bit | **Ponta** | é a ponta que toca o estádio |

O nome de cada peça continua em inglês de qualquer jeito (`Ponta Low Flat`,
`Catraca 3-60`), porque os códigos são iniciais inglesas — exatamente o padrão
que `Lâmina Dran Sword` já usa.

### O cuidado que isso exige

A comunidade e todas as listas de produto dizem "ratchet" e "bit". Quem
procurar `bit Flat` na busca **tem de encontrar**. Então a busca precisa casar
os dois termos, não só o traduzido — senão a tradução piora o catálogo em vez
de melhorar.

Arquivo a mexer: `src/components/rotulos.ts` (`ROTULO_SLOT`), mais o índice de
busca em `src/components/Catalogo.tsx`.

---

## 2. Filtro de beys raros

### O problema, que é maior que o filtro

A `rarity` de hoje é **derivada mecanicamente do tipo de lançamento**: todo
Random Booster virou `rare`, todo o resto `common`. São 60 `rare` e 99
`common`, e nada mais.

Um filtro em cima disso seria um sinônimo de "filtrar por Random Booster". Não
acrescenta informação nenhuma — e o item 3 abaixo não teria o que dizer, porque
a resposta seria a mesma para os 60.

### Onde está a raridade de verdade

O usuário apontou o caminho ao dizer que no BX-50 o Heavens Ring é *o mais
raro*: **dentro de um mesmo Random Booster os beys não saem na mesma
proporção**. E a Beyblade Wiki publica isso, na seção `==Breakdown==` de cada
Random Booster — quantos de cada um vêm numa caixa fechada de 24:

```
Random Booster Vol. 1 — caixa de 24
  3  SharkEdge 3-60LF     ← 12,5%
  3  SharkEdge 4-80N      ← 12,5%
  4  DranSword 3-80B
  4  WizardArrow 3-60T
  5  HellsScythe 4-80LF   ← 20,8%
  5  KnightShield 4-60LF  ← 20,8%
```

Isso é dado por bey, verificável e com fonte. Confirmado presente e aberto nos
Vol. 1, Vol. 4 e Vol. 9; em alguns (ShelterDrake Select, Vol. 11) a seção
existe mas está comentada, sem os números.

### Fontes de raridade além do Random Booster

- **BX-00 / UX-00** — encomenda pelo Takara Tomy Mall, não vai a varejo
- **Prêmio de evento** — o índice oficial marca vários como
  *Beyblade Battle Base Tournament Prize*, *Rare Bey Get Battle*
- **Versão limitada** — Metal Coat, cores especiais, edições de aniversário

O enum `rarity` já tem cinco degraus (`common`, `uncommon`, `rare`,
`very_rare`, `exclusive`) e a ordem de declaração é significativa. Hoje só dois
estão em uso.

### Trabalho

1. Extrair o `Breakdown` de cada Random Booster e gravar a proporção
2. Derivar `rarity` disso e das outras fontes acima, em vez do tipo de produto
3. O filtro em si — pequeno, depois que o dado existir

---

## 3. Por que este bey é raro

Na ficha do bey raro, dizer **a razão**, não só a etiqueta.

Depende inteiramente do item 2: sem o dado real, o texto seria "veio em Random
Booster" para os 60, o que ninguém precisa ler.

Com o dado, vira algo que se lê com proveito:

> **Raro** — saem 3 a cada caixa de 24 do BX-14 Random Booster Vol. 1, contra
> 5 do Hells Scythe da mesma caixa.

> **Exclusivo** — encomenda pelo Takara Tomy Mall, não chegou ao varejo.

### Onde isso mora

**Não** no `notes`. Duas razões: `notes` já carrega outra coisa (a procedência
de um dado específico), e misturar as duas faria a tela exibir os dois textos
juntos sem hierarquia. Merece campo próprio — `rarity_reason` — pelo mesmo
motivo que `data_disputed` virou coluna em vez de texto solto: o que precisa
ser exibido em lugar próprio e filtrado precisa ser dado próprio.

---

## Ordem sugerida

**2 → 3 → 1.** O item 2 é pré-requisito do 3, e os dois mexem em dado e
migration. O item 1 é só de interface e não bloqueia nada — pode entrar a
qualquer momento, inclusive junto com a Onda 3.


---

# Execução — itens 2 e 3 (02/09/2026)

## O que se confirmou

A suspeita registrada acima estava certa, e o defeito era maior do que o
pedido: **`release_type` também estava errado**. Ele saía de um regex sobre o
texto da página do bey, e marcou o `UX-01 Dran Buster 1-60A` como Random
Booster porque uma nota de Trivia menciona um Random Booster ao falar de um
atraso de lançamento. Como `rarity` derivava de `release_type`, o erro
propagava.

Os dois passaram a sair de fonte estrutural, cada uma respondendo só o que
sabe:

| fonte | responde |
|---|---|
| `==Assortment==` de cada Random Booster | quem está dentro |
| `==Breakdown==` do mesmo | quantos de cada por caixa de 24 |
| *List of Beyblade X products* | rótulo do produto e como foi distribuído |

Separar pertinência de proporção é o que permite dizer *"é de Random Booster,
mas a proporção não foi publicada"* em vez de perder o bey.

## Números

`release_type` corrigido em **8 beys**. Os 59 Random Boosters agora são todos
confirmados por pertencer ao Assortment de algum produto — nenhum sobrou por
casamento de texto.

As proporções caem em exatamente quatro valores, e a caixa é sempre de 24:

| por caixa | | vira |
|---|---|---|
| 8 de 24 | 33,3% | Incomum |
| 5 de 24 | 20,8% | Incomum |
| 4 de 24 | 16,7% | Raro |
| 3 de 24 | 12,5% | Muito raro |

Os "Select" têm 3 beys (8 cada, iguais entre si); os "Vol." têm 6, com
proporções diferentes — é aí que existe um bey mais difícil que o vizinho.

Raridade final, agora usando os cinco degraus: **96 comum, 24 incomum, 24
raro, 11 muito raro, 4 exclusivo**. Antes eram dois valores, 99 e 60.

## Sobre os códigos -00

A ideia de tratar todo `BX-00`/`UX-00` como exclusivo foi descartada: são 48
beys, e o código só significa "sem número oficial". O índice anota a
distribuição de verdade — *Mail Order Exclusive*, *Tournament Prize*, *Takara
Tomy Mall*, *Retailer Exclusive* —, e é a anotação que vale como evidência.
Quatro beys se qualificam; os outros são produtos sem número, vendidos
normalmente.

## `rarity_reason`

Coluna própria (migration `0015`), como previsto. O schema cobra a recíproca
nos dois sentidos: bey não-comum **exige** motivo, e bey comum **não pode**
ter — etiqueta sem conteúdo era o problema que a coluna veio resolver.

Na ficha o motivo aparece em bloco próprio, com a cor do degrau; no card, como
tooltip da etiqueta. A composição carrega o motivo **do produto que define sua
raridade**, não de outro: se o BX-14 é Random Booster e o BX-01 é Starter, a
composição é comum pelo BX-01, e explicar pelo BX-14 mentiria sobre o caminho
mais fácil.

## Filtro

Uma segunda fila de chips, com os quatro degraus mais **"Difíceis de achar"**
(qualquer não-comum). O atalho existe porque é o que a pergunta costuma ser, e
respondê-la com os degraus exigiria quatro cliques. Vive na querystring, como
os outros filtros, então o resultado é compartilhável por link.


---

# Execução — item 1 (02/09/2026)

`Ratchet` virou **Catraca** e `Bit` virou **Ponta**. Os slots da Custom Line
ficam em inglês até a onda da CX: traduzir nome de peça que ninguém consegue
ver ainda seria decidir no escuro.

O cuidado pedido — a busca continuar casando os termos em inglês — virou
`BUSCA_SLOT`, um índice com as duas grafias por slot.

## Dois defeitos que já existiam

Escrever isso revelou que o problema era anterior à tradução:

1. **A busca nunca indexou a classe da peça.** `bit Flat` falhava *antes* da
   tradução também — ninguém tinha tentado.

2. **A comparação era substring da frase inteira**, o que exigia que os termos
   fossem vizinhos no índice. Como o nome da peça e a classe dela nunca ficam
   colados, `ponta Low Flat` nunca casaria. Agora cada palavra precisa aparecer
   em algum lugar, em qualquer ordem.

Aproveitou-se para ignorar acento nos dois lados: quem digita `lamina` acha
`Lâmina`.

## Onde mora

A busca saiu do componente para `src/lib/busca.ts`, com teste próprio. O
motivo é o mesmo que levou `decidirOperacao` para fora do hook: a garantia dos
dois idiomas foi um pedido explícito e **não se vê olhando a tela**.
