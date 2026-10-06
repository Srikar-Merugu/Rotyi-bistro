-- Public bucket for dish photos uploaded from /admin/menu. Anyone can view; only admins write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admin upload menu photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-photos' and (select public.is_admin()));
create policy "admin update menu photos" on storage.objects for update to authenticated
  using (bucket_id = 'menu-photos' and (select public.is_admin())) with check (bucket_id = 'menu-photos' and (select public.is_admin()));
create policy "admin delete menu photos" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-photos' and (select public.is_admin()));
