-- Image storage: one public-read bucket. Only admins can upload, replace or delete.
-- Supabase enforces the size and type limits below on every upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  15728640, -- 15 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket files are served by URL without a select policy,
-- so we do not add a broad select policy (that would allow listing every file).
create policy "admins list media" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "admins upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "admins update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "admins delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
