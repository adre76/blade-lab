-- Onda 0 / Task 12 — bucket de imagens
--
-- Bucket publico para leitura, escrita restrita a service_role: so o script
-- de seed envia imagens. parts.image_path e beyblades.image_path guardam o
-- caminho relativo dentro do bucket, nao a URL completa, para que trocar de
-- host nao exija migracao de dados.
--
-- Se a policy falhar com "must be owner of table objects", criar policy em
-- storage.objects exige privilegio de supabase_storage_admin: crie o bucket
-- e a policy pelo painel (Storage > New bucket > Public) e registre aqui que
-- a parte de policy foi manual. Note que, com public = true, a leitura
-- anonima ja funciona pelo endpoint publico — a policy e redundante, ainda
-- que inofensiva.

insert into storage.buckets (id, name, public)
values ('bey-images', 'bey-images', true)
on conflict (id) do nothing;

create policy "imagens leitura publica" on storage.objects
  for select using (bucket_id = 'bey-images');
