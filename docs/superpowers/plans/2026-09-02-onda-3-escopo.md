# Onda 3 — escopo

A onda tem **duas frentes**, pedidas em momentos diferentes e que se sustentam:

1. **O laboratório** — o motor de análise e a montagem de combos
2. **A porta de entrada** — landing page, notícias e um FAQ para iniciantes

Elas não são independentes por acaso. O laboratório responde *"o que esperar
desta combinação"*; a porta de entrada responde *"por que essa pergunta faz
sentido"*. Quem não sabe o que uma catraca alta muda não tem o que perguntar ao
laboratório.

---

## Frente 1 — o laboratório

Já descrito na spec (§5). O motor em `src/lib/`:

| módulo | responsabilidade |
|---|---|
| `stats.ts` | soma e contribuição de cada peça |
| `normalization.ts` | o denominador — máximo teórico **por anatomia** |
| `compatibility.ts` | o que combina com o quê, e o que se anula |
| `archetype.ts` | o arquétipo que sai da combinação |
| `explain.ts` | por que o resultado é esse, em texto |

Mais a tela de montagem com análise em tempo real, e o caminho
peça-que-falta → wishlist, que reaproveita a busca inversa já pronta na ficha
de peça.

O inventário real do usuário dá o caso concreto para testar o
*"você tem as peças para montar isto"*.

---

## Frente 2 — a porta de entrada

Pedida em 02/09/2026. Hoje a raiz do site **é o catálogo**: quem chega cai
direto numa grade de 157 composições, sem nada que diga o que o site é nem o
que aqueles números significam.

### O que a landing precisa ter

**Sobre o site.** O que o Blade X Lab faz, em uma tela: catálogo completo,
inventário pessoal, e um laboratório que analisa combinações antes de você
montar. Com itens visuais — as artes das peças já estão no nosso Storage e são
o material óbvio para isso.

**Notícias.** Links para lançamentos e novidades. Decisão a tomar no plano
detalhado: manual (uma lista curada, que envelhece) ou automática (ler a wiki,
que já sabemos consultar). A segunda é mais trabalho e mais valor — o catálogo
inteiro já vem de lá, e um "o que saiu esse mês" cai no mesmo pipeline.

**FAQ para iniciantes.** O pedido mais concreto, e o que vale mais.

### O que o FAQ tem de responder

O usuário identificou três lacunas de quem começa, e elas são de níveis
diferentes:

1. **Termos.** O que é catraca, ponta, burst, dash, X-Standard. O vocabulário
   mínimo para ler uma ficha de peça sem tropeçar.

2. **Regras.** Como se pontua, o que é um burst finish, o que a rampa do
   estádio muda. Sem isso, "ataque 130" não quer dizer nada.

3. **A relação entre as partes — e é aqui que está o ouro.** *Como montar
   para alcançar um objetivo específico.* Não "o que cada peça faz", mas "o
   que combinar para conseguir X":

   > Quer derrubar o adversário? Lâmina de ataque pesada, catraca **baixa**
   > para o contato bater na altura certa, ponta de borracha que agarra e
   > acelera. Você troca durabilidade por impacto — o bey acaba a batalha
   > cedo, de um jeito ou de outro.

   > Quer sobreviver até o fim? Ponta afiada que gira parada, catraca **alta**
   > para não raspar, lâmina leve e redonda. Você não vai derrubar ninguém.

### O ponto que liga as duas frentes

Esse terceiro item **é o `explain.ts` escrito para humanos antes da máquina**.
As regras que o FAQ vai explicar em prosa são as mesmas que o motor precisa
codificar em `compatibility.ts` e `archetype.ts`.

Isso sugere a ordem: **escrever o FAQ primeiro**, ou pelo menos a seção de
combinações, e usá-lo como especificação do motor. Se eu não consigo explicar
a regra em português para um iniciante, provavelmente não entendi a regra bem
o suficiente para codificá-la — e o motor sairia com números que ninguém sabe
justificar.

### Rotas

Hoje `/` é o catálogo. A landing precisa da raiz, o que empurra o catálogo
para `/catalogo`. Um redirecionamento cuida dos links já compartilhados —
inclusive os com filtro na querystring, que agora existem.

---

## Ordem sugerida

1. FAQ de combinações (em prosa, sem código) — vira a spec do motor
2. Motor + tela do laboratório
3. Landing page, notícias e o resto do FAQ

O item 1 é barato e destrava o 2. O item 3 não bloqueia nada e pode entrar em
paralelo.
