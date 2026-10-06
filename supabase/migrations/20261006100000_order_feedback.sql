-- Private guest rating after the bill is paid (one per order), plus the
-- venue's Google review link shown to every guest (no review gating).
alter table public.settings add column if not exists google_review_url text
  check (google_review_url is null or google_review_url ~ '^https://');

create table public.order_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  locale text not null default 'hu' check (locale in ('hu', 'en')),
  table_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.order_feedback (created_at desc);

alter table public.order_feedback enable row level security;
-- Guests write through the server (guest key check); only admins read.
create policy "admin read feedback" on public.order_feedback for select to authenticated using ((select public.is_admin()));
create policy "admin delete feedback" on public.order_feedback for delete to authenticated using ((select public.is_admin()));

alter publication supabase_realtime add table public.order_feedback;
