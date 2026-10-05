-- Trigger-only functions: never callable via the API.
revoke execute on function public.link_staff_on_signup() from public, anon, authenticated;
revoke execute on function public.link_staff_on_invite() from public, anon, authenticated;
revoke execute on function public.guard_menu_item_update() from public, anon, authenticated;
revoke execute on function public.touch_order() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- Role helpers: needed by RLS for signed-in users only; they only reveal the caller's own role.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.staff_role() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.staff_role() to authenticated;

-- FK indexes
create index if not exists booking_requests_status_changed_by_idx on public.booking_requests (status_changed_by);
create index if not exists booking_requests_table_id_idx on public.booking_requests (table_id);
create index if not exists order_items_item_id_idx on public.order_items (item_id);

-- Split admin "for all" policies so SELECT is covered by exactly one policy.
drop policy "admin write categories" on public.menu_categories;
create policy "admin insert categories" on public.menu_categories for insert to authenticated with check ((select public.is_admin()));
create policy "admin update categories" on public.menu_categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete categories" on public.menu_categories for delete to authenticated using ((select public.is_admin()));

drop policy "admin write items" on public.menu_items;
drop policy "kitchen toggles availability" on public.menu_items;
create policy "admin insert items" on public.menu_items for insert to authenticated with check ((select public.is_admin()));
-- Kitchen can update too; the menu_items_guard trigger limits kitchen to `available`.
create policy "staff update items" on public.menu_items for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "admin delete items" on public.menu_items for delete to authenticated using ((select public.is_admin()));

drop policy "admin write lunch" on public.daily_lunch;
create policy "admin insert lunch" on public.daily_lunch for insert to authenticated with check ((select public.is_admin()));
create policy "admin update lunch" on public.daily_lunch for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy "admin write tables" on public.dining_tables;
create policy "admin insert tables" on public.dining_tables for insert to authenticated with check ((select public.is_admin()));
create policy "admin update tables" on public.dining_tables for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete tables" on public.dining_tables for delete to authenticated using ((select public.is_admin()));

drop policy "admin manage staff" on public.staff;
create policy "admin insert staff" on public.staff for insert to authenticated with check ((select public.is_admin()));
create policy "admin update staff" on public.staff for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete staff" on public.staff for delete to authenticated using ((select public.is_admin()));
