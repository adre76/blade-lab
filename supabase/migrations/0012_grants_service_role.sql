-- Onda 1 — grants para o role de administração.
--
-- O MESMO DEFEITO DA 0010, DO OUTRO LADO.
--
-- A 0010 concedeu grants a anon e authenticated e esqueceu service_role. O
-- resultado: o script de seed falhava com 42501 (insufficient_privilege) em
-- toda escrita, mesmo com a chave correta.
--
-- A confusão é sempre a mesma: service_role IGNORA RLS, mas NÃO IGNORA GRANT.
-- "Bypassa row level security" não quer dizer "pode tocar na tabela" — a
-- permissão de tabela é uma camada anterior, e nenhuma policy a substitui.
--
-- service_role é o role de administração: só o script de seed e o painel o
-- usam, nunca o navegador. Por isso recebe tudo.

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Tabelas criadas em migrations futuras herdam o grant, para que este
-- esquecimento não possa se repetir.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
