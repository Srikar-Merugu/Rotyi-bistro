-- Staff devices that accepted push notifications (staff PWA).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- Each staff member manages only their own devices; the server sends with the service role.
create policy "own subscriptions read" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "own subscriptions add" on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_staff()));
create policy "own subscriptions remove" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
