# Administração SQL — Blade X Lab

Comandos executados no SQL Editor do painel do Supabase.
Projeto: `gbcpfsczjivtwkyheihu` (BLADEXLAB, us-east-1).

O catálogo é somente-leitura pela API por decisão de projeto (spec §4.7): não
existe tela de administração, e toda correção entra por aqui.

---

## Alterar uma anatomia já em uso — LEIA ANTES

Os triggers de validade de combo rodam **apenas em escrita, nunca em repouso**.

Remover um slot de uma anatomia em `data/anatomies.json` e rodar
`npm run sync:anatomies` deixa os combos já salvos daquela anatomia inválidos
e **silenciosamente imutáveis**: não podem mais ser sequer renomeados, porque
`update_combo` revalida o conjunto inteiro de slots.

Alterar uma anatomia em uso exige migrar os combos afetados na mesma transação.
Antes de mexer, veja quantos combos seriam atingidos:

```sql
select c.anatomy, count(*) as combos_afetados
from combos c
group by c.anatomy
order by c.anatomy;
```

## Aposentar ou fundir uma peça

Todas as FKs do catálogo são `on delete restrict`. Apagar uma peça referenciada
falha de propósito — para não destruir combos de usuários. Migre as referências
primeiro:

```sql
-- quem usa esta peca?
select 'bey de fabrica' as origem, b.release_code, b.name
from beyblade_parts bp join beyblades b on b.id = bp.beyblade_id
where bp.part_id = 'UUID-DA-PECA'
union all
select 'combo de usuario', c.id::text, c.name
from combo_parts cp join combos c on c.id = cp.combo_id
where cp.part_id = 'UUID-DA-PECA';
```

## A armadilha que já mordeu duas vezes: RLS ≠ GRANT

São **duas camadas independentes**, e as duas precisam estar certas:

| Camada | Responde a | Se faltar |
|---|---|---|
| `GRANT` | "este role pode tocar nesta tabela?" | `42501 permission denied` |
| Policy RLS | "quais linhas ele enxerga?" | consulta devolve zero linhas |

Sem `GRANT`, o Postgres recusa **antes** de avaliar qualquer policy. Ter policy
não é ter acesso.

Isto derrubou o projeto duas vezes, dos dois lados:

1. **Onda 0** — as policies de leitura pública existiam, mas faltavam os grants
   a `anon`. O app quebrou com `permission denied for table anatomy_slots` na
   primeira leitura real. Corrigido na `0010`.
2. **Onda 1** — a `0010` concedeu a `anon` e `authenticated` e esqueceu
   `service_role`. O script de seed falhava em toda escrita, mesmo com a chave
   correta. Corrigido na `0012`, que também define *default privileges* para que
   tabelas futuras herdem o grant.

**"`service_role` ignora RLS" não quer dizer "`service_role` pode escrever".**

Ao criar tabela nova, confirme os três roles:

```sql
select c.relname as tabela,
       has_table_privilege('anon',          c.oid, 'SELECT') as anon_le,
       has_table_privilege('authenticated', c.oid, 'SELECT') as auth_le,
       has_table_privilege('service_role',  c.oid, 'INSERT') as admin_escreve,
       c.relrowsecurity as rls
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by c.relname;
```

`admin_escreve` **falso em qualquer linha** significa que o seed vai falhar
naquela tabela.

## Diagnóstico rápido

```sql
-- nenhuma tabela pode ficar sem RLS
select relname from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r' and not relrowsecurity;

-- o catalogo nao pode ter policy de escrita
select tablename, cmd from pg_policies
where schemaname = 'public'
  and tablename in ('parts','beyblades','beyblade_parts','anatomy_slots')
  and cmd <> 'SELECT';

-- so get_shared_combo pode ser executavel por anon
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_pode
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('save_combo','update_combo','share_combo',
                    'revoke_combo_share','get_shared_combo')
order by p.proname;
```

As três consultas acima devem retornar, respectivamente: nenhuma linha,
nenhuma linha, e `anon_pode` verdadeiro apenas para `get_shared_combo`.

## Verificação completa do schema

`supabase/tests/schema_checks.sql` roda as cinco regras críticas dentro de uma
transação com `rollback`. Rode depois de qualquer alteração estrutural.

---

As seções de atendimento a usuário e conformidade com a LGPD, a exemplo do
`SUPABASE_ADMIN.md` do Trocação, entram nas ondas seguintes, quando houver
usuários reais.
