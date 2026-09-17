# O que ficou de fora do catálogo, e por quê

Este arquivo existe porque a razão de um descarte é a informação mais fácil de
perder e a mais cara de reconstruir. Até a Onda CX, a lista de descartes só
existia na saída do terminal de quem coletava — e sumia quando a janela
fechava.

O preço apareceu duas vezes:

- O Lightning L-Drago foi descartado na Onda 1 por "não ter stats publicados".
  A wiki publicou os stats depois, e ninguém tinha como saber que valia
  reconferir.
- As Ratchet-Integrated Blades foram descartadas como "só da Hasbro", vago
  demais para ser reavaliado. A razão de verdade é outra, e está abaixo.

Cada entrada tem quatro campos, e o quarto é o que faltava: **o que teria de
mudar para o item entrar**.

Escrito à mão, não gerado. A razão de um descarte é julgamento; o coletor só
sabe dizer que falhou.

---

## Ratchet-Integrated Blades exclusivas da Hasbro

**O que é.** Quatro lâminas com catraca integrada que só existem sob a marca
Hasbro.

| Peça | Código | Seção Takara Tomy na wiki | Nome TT |
|---|---|---|---|
| `Cutter Shinobi` | G1940 | comentada | `<!--ShinobiShuriken-->` |
| `Rampart Aegis` | G1940 | comentada | `<!--AegisRampart-->` |
| `Valor Bison` | G3497 | comentada | `<!--BisonBurrow-->` |
| `Seize Jaguar` | G4570 | comentada | — |

**Razão.** O catálogo não tem nenhuma peça nem nenhum bey da Hasbro. A coluna
`brand`, o `equivalent_id` e a resolução para canonical existem no schema desde
a Onda 0 e nunca tiveram dado. Estas quatro seriam as primeiras linhas Hasbro —
e são o pior primeiro caso, porque são **exclusivas**: não há peça Takara Tomy
para a qual apontar, que é o que o modelo assume existir sempre.

**Evidência.** Nenhuma das quatro tem código Takara Tomy. Nas três primeiras, o
nome Takara Tomy está comentado no wikitext (`<!--BisonBurrow (Takara Tomy)-->`)
e a seção `===Takara Tomy===` da lista de produtos também — a convenção da wiki
para produto anunciado que não saiu. Verificado em 09/09/2026 pela API.

**O que teria de mudar.** Uma de duas coisas:

1. Os produtos Takara Tomy saírem. Aí elas deixam de ser exclusivas, ganham
   canônica e entram pelo caminho normal. `npm run coletar` reconfere sozinho.
2. O catálogo abrir a marca Hasbro — o que exige permitir peça Hasbro sem
   equivalente, mudar o teste `toda peça hasbro aponta para uma peça
   takara_tomy existente` e a §4.8 da spec principal, e coletar também os beys
   Hasbro para as peças não ficarem órfãs. É frente própria, não rodapé.

**Registrado em.** Onda 1 (razão vaga), corrigido na Onda CX em 09/09/2026.
A correção veio de uma pergunta: *"não encontrei o Beyblade X da série UX
chamado Valor Bison"*. Não existe.

---

## Lock Chip Enlil, Metal Blade Hurricane e Over Blade I — exclusivas da Hasbro

**O que é.** Três peças da Custom Line que só existem sob a marca Hasbro: a
trava (`lock_chip`) `Enlil`, a lâmina metálica (`metal_blade`) `Hurricane` e a
ponta (`over_blade`) `I` — as três compõem o Infinity Starter Pack Hasbro
`Hurricane Enlil IS 7-55T`.

| Peça | Código | Seção Takara Tomy na wiki | Nome TT |
|---|---|---|---|
| `Enlil` | G2750 (Hasbro) | comentada | — |
| `Hurricane` | G2750 (Hasbro) | inexistente | — |
| `I` | G2750 (Hasbro) | comentada | — |

**Razão.** A mesma política já registrada acima para as Ratchet-Integrated
Blades, aplicada à mesma classe de problema: nenhuma das três tem
correspondente Takara Tomy conhecido, e o catálogo só tem peça e bey Takara
Tomy.

**Evidência.** Nenhuma das três tem `AKA` nem nome Takara Tomy no infobox.
Em duas (`Enlil`, `I`) a seção `===Takara Tomy===` de `==Products==` está
comentada no wikitext; na terceira (`Hurricane`) a seção nem existe,
comentada ou não — só `===Hasbro===`. Verificado em 10/09/2026 pela API.

**O que teria de mudar.** As mesmas duas condições já registradas acima para
as Ratchet-Integrated Blades: o produto Takara Tomy equivalente sair (o
coletor reconfere sozinho, sem intervenção), ou o catálogo abrir a marca
Hasbro (frente própria, não rodapé).

**Registrado em.** Onda CX, na coleta real de 10/09/2026.

---

## Custom Line, durante as Ondas 1 a 3

**O que é.** A linha CX inteira — beys e peças.

**Razão.** Escopo. As ondas 1 a 3 fecharam BX e UX primeiro.

**Evidência.** Registrada nos planos das ondas correspondentes.

**O que teria de mudar.** Nada — **resolvido na Onda CX**. Mantido aqui como
registro de que o descarte foi deliberado e não esquecimento.

---

## Lightning L-Drago (Upper Type e Rapid-Hit Type)

**O que é.** Duas lâminas BX-00 do X-Over Project, de giro anti-horário.

**Razão original.** A wiki não publicava os atributos.

**O que mudou.** A wiki passou a publicar: ATQ 55/25/20 (Upper Type) e
50/30/20 (Rapid-Hit Type), pesos 34,0 g e 33,5 g. Verificado em 09/09/2026.

**Situação.** **Resolvido na Onda CX** — entram como lâminas `basic` comuns, e
são as primeiras lâminas canhotas do catálogo.
