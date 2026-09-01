# Antes da Onda 3 — pendências pedidas pelo usuário

Três itens combinados em 01/09/2026, para fazer **antes** do laboratório.

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
