-- Onda 0 — endurecimento apontado pelo linter de seguranca do Supabase
--
-- handle_new_user e SECURITY DEFINER (precisa ser, para inserir em profiles a
-- partir de um insert em auth.users). Mas o create function concede EXECUTE a
-- PUBLIC por padrao, e isso a expos em /rest/v1/rpc/handle_new_user.
--
-- Chama-la por ali falharia ("trigger functions can only be called as
-- triggers"), entao o risco pratico e baixo — mas funcao SECURITY DEFINER
-- alcancavel pela API publica nao deve existir por higiene.
--
-- Revogar EXECUTE nao afeta o trigger: triggers executam com os privilegios
-- do dono da tabela, nao do chamador. Verificado apos aplicar.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- As outras funcoes de trigger nao sao SECURITY DEFINER, mas tambem nao tem
-- por que estarem na API publica.
revoke execute on function public.set_updated_at()       from public, anon, authenticated;
revoke execute on function public.touch_profile()        from public, anon, authenticated;
revoke execute on function public.validate_combo_slots() from public, anon, authenticated;

-- gen_share_slug e chamada pelo default da coluna, dentro de share_combo.
revoke execute on function public.gen_share_slug() from public, anon, authenticated;
