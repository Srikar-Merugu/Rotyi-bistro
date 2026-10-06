-- Approved bookings become reservations: seated / completed / no-show,
-- with dishes picked on the website kept as menu ids for a kitchen pre-order.
alter table public.booking_requests drop constraint if exists booking_requests_status_check;
alter table public.booking_requests add constraint booking_requests_status_check
  check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'seated', 'completed', 'no_show'));
alter table public.booking_requests add column if not exists dish_ids text[] not null default '{}';
alter table public.booking_requests add column if not exists seated_at timestamptz;

alter table public.orders add column if not exists booking_id uuid references public.booking_requests (id) on delete set null;
alter table public.orders add column if not exists source text not null default 'qr' check (source in ('qr', 'booking', 'staff'));
create index if not exists orders_booking_id_idx on public.orders (booking_id);
create index if not exists booking_requests_upcoming_idx on public.booking_requests (booking_date, booking_time) where status in ('confirmed', 'seated');

-- Kitchen sees today's approved reservations (time, size, table, pre-order) to prep.
create policy "kitchen read todays reservations" on public.booking_requests for select to authenticated
  using ((select public.staff_role()) = 'kitchen' and status in ('confirmed', 'seated')
         and booking_date = (now() at time zone 'Europe/Budapest')::date);
