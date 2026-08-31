# Onda 2 — Conta e Inventário — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar conta ao usuário e deixá-lo registrar o que possui e o que deseja — login com Google, perfil editável, e o "eu tenho / eu quero" com quantidade, integrado ao catálogo que já existe.

**Architecture:** Nada de schema novo. `profiles`, `inventory_items`, as policies de RLS, o trigger que cria o perfil e a view `user_parts` existem desde a Onda 0 e foram verificados. Esta onda é **só frontend**: um hook de sessão, um de inventário, duas telas e ações no card do catálogo.

**Tech Stack:** o mesmo. Nenhuma dependência nova.

**Spec:** [`docs/superpowers/specs/2026-08-31-blade-x-lab-design.md`](../specs/2026-08-31-blade-x-lab-design.md)
**Onda anterior:** [`2026-08-31-onda-1-catalogo.md`](2026-08-31-onda-1-catalogo.md)

---

## Estado verificado antes de começar

Consultado no banco em 2026-08-31:

| Item | Estado |
|---|---|
| `profiles` + trigger `on_auth_user_created` | ✅ existe |
| `inventory_items` + policy própria | ✅ existe |
| `authenticated` pode escrever no inventário | ✅ sim |
| View `user_parts` (estoque derivado) | ✅ existe |
| Usuários cadastrados | 0 |
| **Provedor Google no Supabase Auth** | ❌ **não habilitado** — só `email` |

## Pré-requisito manual: habilitar o Google (só o usuário pode fazer)

Sem isto, a tela de login existe mas o botão não funciona. **Não bloqueia nenhuma
outra task deste plano.**

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   criar credenciais **OAuth 2.0 Client ID** do tipo *Web application*.
2. Em *Authorized redirect URIs*, adicionar:
   `https://gbcpfsczjivtwkyheihu.supabase.co/auth/v1/callback`
3. No painel do Supabase: *Authentication → Providers → Google*, habilitar e
   colar o **Client ID** e o **Client Secret**.
4. Em *Authentication → URL Configuration*, conferir que **Site URL** é
   `https://blade-x-lab.vercel.app` e que `http://localhost:5173/**` está em
   *Redirect URLs* — sem isso o login funciona em produção e falha em
   desenvolvimento.

**O Client Secret não deve passar por chat.** Ele vai direto do Google Cloud
para o painel do Supabase.

Para conferir depois, sem abrir o painel:

```bash
curl -s "https://gbcpfsczjivtwkyheihu.supabase.co/auth/v1/settings" \
  -H "apikey: <publishable key>" | grep -o '"google":[a-z]*'
```

---

## Decisões desta onda

**Sem modo anônimo.** O spec §2 fixa "somente Google OAuth, sem e-mail/senha,
sem modo anônimo". O provedor `email` aparece habilitado no projeto por ser o
padrão do Supabase; a interface não o expõe. Se um dia for desejado, é decisão
nova, não omissão desta.

**O catálogo continua público.** Nada do que esta onda acrescenta pode exigir
login para navegar. As ações de inventário aparecem no card, mas para o visitante
anônimo elas convidam a entrar em vez de sumir — quem não sabe que a
funcionalidade existe não a procura.

**Quantidade só em `owned`.** O `check` do banco já garante isso (spec §4.5): na
wishlist, quantidade não tem significado. A interface não deve nem oferecer.

**Posse e desejo são exclusivos.** `unique (profile_id, beyblade_id)` no banco.
Marcar como adquirido um bey da wishlist é um `update` de status, não uma linha
nova — e a interface deve deixar isso óbvio, com um único controle de três
estados em vez de dois botões independentes.

---

## Chunk 1: Sessão e perfil

### Task 1: Hook de autenticação

**Files:**
- Create: `src/hooks/useAuth.ts`

**Interfaces:** expõe `{ usuario, perfil, carregando, entrarComGoogle, sair, atualizarNome }`. Consumido pelo layout, pela tela de perfil e pelo hook de inventário.

- [ ] **Step 1: Escrever o hook**

Espelha o `useAuth` do Trocação, com duas diferenças: TypeScript, e sem
Facebook. Pontos que não podem ser simplificados:

- `onAuthStateChange` com `unsubscribe` na limpeza do efeito.
- Carregar o perfil após `SIGNED_IN` **e** após `TOKEN_REFRESHED` — a sessão
  restaurada de um recarregamento chega pelo segundo, não pelo primeiro.
- Limpar o hash da URL depois do retorno do OAuth (`access_token` fica visível
  na barra de endereços).
- `redirectTo: window.location.origin` — fixar a URL de produção quebraria o
  login em desenvolvimento.

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`

- [ ] **Step 3: Commit**

---

### Task 2: Tela de login e estado no cabeçalho

**Files:**
- Create: `src/components/Login.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: `Login.tsx`** — tela simples, com o botão do Google e uma linha
  dizendo o que a conta acrescenta ("registre o que você tem e monte combos com
  as suas peças"). Sem prometer o que a onda 3 ainda não entrega.
- [ ] **Step 2: Cabeçalho** — quando anônimo, um link "Entrar"; quando
  autenticado, o nome e um menu com "Meu inventário", "Alterar nome" e "Sair".
- [ ] **Step 3: Rota `/entrar`**, e `/inventario` protegida: sem sessão,
  redireciona para `/entrar` guardando o destino.
- [ ] **Step 4: Verificar no navegador** — a tela aparece, o botão dispara o
  fluxo (falhará até o pré-requisito ser cumprido, e a mensagem de erro deve
  dizer isso em vez de quebrar em silêncio).
- [ ] **Step 5: Commit**

---

### Task 3: Nome de exibição

**Files:**
- Create: `src/components/Perfil.tsx`

O trigger `handle_new_user` já preenche o `display_name` com o nome do Google
(spec §4.6). Esta tela permite corrigi-lo.

- [ ] **Step 1: Tela com o campo e salvamento**, respeitando que o trigger
  `touch_profile` rejeita alteração de qualquer campo que não seja o nome.
- [ ] **Step 2: Verificar que um nome vazio é recusado** — a coluna é `not null`.
- [ ] **Step 3: Commit**

---

## Chunk 2: Inventário

### Task 4: Hook de inventário

**Files:**
- Create: `src/hooks/useInventory.ts`

**Interfaces:** `{ itens, estado(beybladeId), definir(beybladeId, estado, quantidade), carregando }`, onde `estado` é `"nenhum" | "owned" | "wishlist"`.

- [ ] **Step 1: Escrever o hook**

Regras que vêm do banco e a interface precisa respeitar:

- **Um bey tem um único estado.** `unique (profile_id, beyblade_id)`: mudar de
  wishlist para possuído é `update`, não `insert`. Um `insert` cego devolveria
  violação de constraint.
- **Quantidade só faz sentido em `owned`.** O `check` recusa quantidade > 1 na
  wishlist.
- **Remover é `delete`**, quando o estado vira `"nenhum"`.

- [ ] **Step 2: Testes das transições de estado**

Aqui cabe teste de unidade de verdade — a função que decide entre `insert`,
`update` e `delete` a partir do estado atual e do desejado é lógica pura e é
onde o erro dói (violação de constraint na cara do usuário). Extraia-a do hook
e teste as nove combinações.

- [ ] **Step 3: Commit**

---

### Task 5: Ações no card do catálogo

**Files:**
- Modify: `src/components/BeyCard.tsx`

- [ ] **Step 1: Controle de três estados** no rodapé do card — nenhum / tenho /
  quero. Um controle só, não dois botões, porque os estados são exclusivos.
- [ ] **Step 2: Quantidade** aparece só quando "tenho", como incremento
  discreto.
- [ ] **Step 3: Anônimo** — o controle aparece e convida a entrar ao ser clicado,
  em vez de sumir.
- [ ] **Step 4: Cuidado com o card ser um link.** O card inteiro é um `<Link>`
  para o detalhe desde a Onda 1; os controles precisam de `preventDefault` e
  `stopPropagation`, senão clicar em "tenho" navega para a página do bey.
- [ ] **Step 5: Verificar no navegador**, inclusive que o clique no controle não
  navega.
- [ ] **Step 6: Commit**

---

### Task 6: Tela de inventário

**Files:**
- Create: `src/components/Inventario.tsx`

- [ ] **Step 1: Duas seções** — "Tenho" e "Quero", cada uma com a contagem.
- [ ] **Step 2: Resumo do estoque de peças**, lendo a view `user_parts`. É a
  primeira vez que o estoque derivado aparece na interface, e é o que a onda 3
  vai consumir: mostrar aqui valida a view antes de o laboratório depender dela.
- [ ] **Step 3: Estado vazio** que leve ao catálogo, em vez de uma lista em
  branco.
- [ ] **Step 4: Verificar no navegador**
- [ ] **Step 5: Commit**

---

## Chunk 3: Verificação

### Task 7: Provar o isolamento entre usuários

**Files:**
- Create: `supabase/tests/rls_inventario.sql`

O RLS de `inventory_items` nunca foi exercitado com dois usuários reais. É a
primeira vez que o banco guarda dado privado — e "a policy existe" não é o
mesmo que "o isolamento funciona", como a Onda 0 já ensinou duas vezes com os
grants.

- [ ] **Step 1: Script que cria dois usuários**, dá inventário a cada um, e
  verifica com `set local role authenticated` + `request.jwt.claims` que:
  - cada um enxerga apenas o próprio inventário;
  - `user_parts` não vaza estoque entre usuários (é onde o `security_invoker`
    seria testado de verdade);
  - o mesmo bey não pode ser `owned` e `wishlist` ao mesmo tempo;
  - quantidade > 1 é recusada na wishlist.
- [ ] **Step 2: Rodar e conferir** que nenhuma verificação falha.
- [ ] **Step 3: Commit**

---

### Task 8: Fluxo completo com usuário real

Depende do pré-requisito do Google.

- [ ] **Step 1: Entrar com o Google** e confirmar que o perfil foi criado pelo
  trigger, com o nome vindo da conta.
- [ ] **Step 2: Marcar beys** como tenho/quero pelo catálogo.
- [ ] **Step 3: Conferir a tela de inventário** e o estoque de peças derivado.
- [ ] **Step 4: Sair e voltar**, confirmando que a sessão persiste e o inventário
  reaparece.
- [ ] **Step 5: Commit**

---

## Critério de conclusão

- [ ] `npm test` e `npm run build` passam.
- [ ] Catálogo continua navegável **sem login**.
- [ ] Login com Google funciona em produção e em desenvolvimento.
- [ ] Perfil criado automaticamente, com nome editável.
- [ ] Tenho/quero funciona pelo card, sem navegar ao clicar.
- [ ] Quantidade só em "tenho".
- [ ] Tela de inventário com estoque de peças derivado.
- [ ] `rls_inventario.sql` passa: nenhum usuário vê o inventário do outro.

## Riscos

| Risco | Tratamento |
|---|---|
| Login funciona em produção e falha em desenvolvimento | `localhost:5173/**` nas Redirect URLs; conferir na Task 8 |
| Clique no controle de inventário navega para o detalhe | O card é um `<Link>` desde a Onda 1 — `preventDefault` explícito e verificação no navegador |
| `insert` cego onde deveria ser `update` | Estados exclusivos por constraint; a função de transição é testada isoladamente |
| RLS parecer certo e vazar | Task 7 exercita com dois usuários, em vez de confiar na leitura das policies |
