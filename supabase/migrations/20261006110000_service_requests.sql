-- Guest taps "Call waiter" / "Bring the bill" on the QR page → staff alert.
-- One open request per kind per table, so repeated taps don't spam staff.
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.dining_tables (id) on delete cascade,
  table_label text not null,
  kind text not null check (kind in ('waiter', 'bill')),
  payment text check (payment in ('card', 'cash')),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references auth.users (id)
);
create unique index service_requests_one_open on public.service_requests (table_id, kind) where status = 'open';
create index on public.service_requests (status, created_at desc);
create index on public.service_requests (done_by);

alter table public.service_requests enable row level security;
create policy "staff read service requests" on public.service_requests for select to authenticated using ((select public.is_staff()));
create policy "staff close service requests" on public.service_requests for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
revoke update on public.service_requests from authenticated;
grant update (status, done_at, done_by) on public.service_requests to authenticated;

alter publication supabase_realtime add table public.service_requests;
