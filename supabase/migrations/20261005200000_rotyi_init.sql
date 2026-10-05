-- Rotyi Bisztró: bookings, dine-in QR ordering, kitchen display, alerts, email outbox.
-- Guests never write directly: the Next.js server validates and inserts with the
-- service role. Staff (admin / kitchen) read and act through RLS + Realtime.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- staff & roles
create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  role text not null check (role in ('admin', 'kitchen')),
  created_at timestamptz not null default now()
);

create or replace function public.staff_role()
returns text
language sql stable security definer
set search_path = ''
as $$ select role from public.staff where user_id = (select auth.uid()) $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = (select auth.uid())) $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = (select auth.uid()) and role = 'admin') $$;

-- Links a staff row to an auth user by email once that person signs up / is invited.
create or replace function public.link_staff_on_signup()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.staff_invites i set used_at = now()
   where lower(i.email) = lower(new.email) and i.used_at is null;
  insert into public.staff (user_id, email, role, name)
  select new.id, new.email, i.role, i.name
    from public.staff_invites i
   where lower(i.email) = lower(new.email)
   order by i.created_at desc
   limit 1
  on conflict (user_id) do nothing;
  return new;
end $$;

create table public.staff_invites (
  email text primary key,
  role text not null check (role in ('admin', 'kitchen')),
  name text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create trigger on_auth_user_created_link_staff
after insert on auth.users
for each row execute function public.link_staff_on_signup();

-- And the other way round: inviting an email that already has an account.
create or replace function public.link_staff_on_invite()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.staff (user_id, email, role, name)
  select u.id, u.email, new.role, new.name from auth.users u where lower(u.email) = lower(new.email)
  on conflict (user_id) do update set role = excluded.role, name = coalesce(excluded.name, public.staff.name);
  if found then new.used_at := now(); end if;
  return new;
end $$;

create trigger on_staff_invite
before insert or update of role on public.staff_invites
for each row execute function public.link_staff_on_invite();

-- ---------------------------------------------------------------- settings
create table public.settings (
  id boolean primary key default true check (id),
  owner_email text,
  lunch_price_two integer not null default 3490,
  lunch_price_three integer not null default 3990,
  ordering_open boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true);

-- ---------------------------------------------------------------- menu
create table public.menu_categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name_hu text not null,
  name_en text not null,
  sort integer not null default 0
);

create table public.menu_items (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  category_id text not null references public.menu_categories (id) on update cascade,
  name_hu text not null,
  name_en text not null,
  description_hu text not null default '',
  description_en text not null default '',
  price integer not null check (price >= 0),
  tags text[] not null default '{}',
  image text,
  quick jsonb not null default '{}',
  signature boolean not null default false,
  available boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);
create index on public.menu_items (category_id, sort);

create table public.daily_lunch (
  weekday smallint primary key check (weekday between 0 and 4), -- 0 = Monday
  soup_hu text not null, soup_en text not null,
  main_hu text not null, main_en text not null,
  dessert_hu text not null, dessert_en text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings
create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)),
  kind text not null default 'table' check (kind in ('table', 'group')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 5 and 254),
  phone text not null check (char_length(phone) between 6 and 32),
  party_size integer not null check (party_size between 1 and 60),
  booking_date date not null,
  booking_time time,
  occasion text check (char_length(occasion) <= 120),
  note text check (char_length(note) <= 1000),
  dishes text[] not null default '{}',
  locale text not null default 'hu' check (locale in ('hu', 'en')),
  admin_note text check (char_length(admin_note) <= 1000),
  table_id uuid,
  created_at timestamptz not null default now(),
  status_changed_at timestamptz,
  status_changed_by uuid references auth.users (id)
);
create index on public.booking_requests (status, booking_date);
create index on public.booking_requests (created_at desc);

-- ---------------------------------------------------------------- tables & QR
create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (char_length(label) between 1 and 20),
  seats integer not null default 4 check (seats between 1 and 30),
  area text not null default 'inside' check (area in ('inside', 'window', 'terrace', 'bar')),
  qr_token text not null unique default encode(extensions.gen_random_bytes(9), 'base64'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- URL-safe tokens
alter table public.dining_tables alter column qr_token
  set default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=', '-_');

alter table public.booking_requests
  add constraint booking_requests_table_id_fkey foreign key (table_id) references public.dining_tables (id) on delete set null;

-- ---------------------------------------------------------------- orders
create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null default nextval('public.order_number_seq'),
  table_id uuid not null references public.dining_tables (id),
  table_label text not null,
  status text not null default 'placed'
    check (status in ('placed', 'accepted', 'preparing', 'ready', 'served', 'paid', 'cancelled')),
  guest_name text check (char_length(guest_name) <= 80),
  guest_email text check (char_length(guest_email) <= 254),
  note text check (char_length(note) <= 500),
  locale text not null default 'hu' check (locale in ('hu', 'en')),
  total integer not null check (total >= 0),
  guest_key text not null default translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', '-_'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz
);
create index on public.orders (status, created_at desc);
create index on public.orders (table_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id text references public.menu_items (id) on delete set null,
  name text not null,
  unit_price integer not null check (unit_price >= 0),
  qty integer not null check (qty between 1 and 20),
  note text check (char_length(note) <= 200),
  done boolean not null default false
);
create index on public.order_items (order_id);

create or replace function public.touch_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'accepted' and new.accepted_at is null then new.accepted_at := now(); end if;
    if new.status = 'ready' and new.ready_at is null then new.ready_at := now(); end if;
    if new.status = 'served' and new.served_at is null then new.served_at := now(); end if;
  end if;
  return new;
end $$;

create trigger orders_touch before update on public.orders
for each row execute function public.touch_order();

-- ---------------------------------------------------------------- alerts & email
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('admin', 'kitchen', 'all')),
  kind text not null,
  title text not null,
  body text,
  ref_type text check (ref_type in ('booking', 'order', 'system')),
  ref_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.notifications (created_at desc);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  html text not null,
  kind text not null,
  ref_type text,
  ref_id uuid,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index on public.email_outbox (created_at desc);

-- ---------------------------------------------------------------- RLS
alter table public.staff enable row level security;
alter table public.staff_invites enable row level security;
alter table public.settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.daily_lunch enable row level security;
alter table public.booking_requests enable row level security;
alter table public.dining_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;

-- Public website reads
create policy "public read categories" on public.menu_categories for select to anon, authenticated using (true);
create policy "public read items" on public.menu_items for select to anon, authenticated using (true);
create policy "public read lunch" on public.daily_lunch for select to anon, authenticated using (true);

-- Staff
create policy "staff read self or admin all" on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admin manage staff" on public.staff for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin manage invites" on public.staff_invites for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Settings
create policy "staff read settings" on public.settings for select to authenticated using ((select public.is_staff()));
create policy "admin update settings" on public.settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Menu management
create policy "admin write categories" on public.menu_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write items" on public.menu_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "kitchen toggles availability" on public.menu_items for update to authenticated
  using ((select public.staff_role()) = 'kitchen') with check ((select public.staff_role()) = 'kitchen');
create policy "admin write lunch" on public.daily_lunch for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Bookings: admin only
create policy "admin read bookings" on public.booking_requests for select to authenticated using ((select public.is_admin()));
create policy "admin update bookings" on public.booking_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Tables: admin manages, staff reads
create policy "staff read tables" on public.dining_tables for select to authenticated using ((select public.is_staff()));
create policy "admin write tables" on public.dining_tables for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Orders: staff read; status changes go through the server API (transition
-- rules + guest emails), so browsers can't update orders directly.
create policy "staff read orders" on public.orders for select to authenticated using ((select public.is_staff()));
create policy "staff read order items" on public.order_items for select to authenticated using ((select public.is_staff()));
create policy "staff update order items" on public.order_items for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Alerts
create policy "staff read notifications" on public.notifications for select to authenticated
  using ((select public.is_staff()) and (audience = 'all' or audience = (select public.staff_role()) or (select public.is_admin())));
create policy "staff mark notifications read" on public.notifications for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Email log: admin only
create policy "admin read outbox" on public.email_outbox for select to authenticated using ((select public.is_admin()));

-- Column-level limits on what staff browsers may change directly.
revoke update on public.order_items from authenticated;
grant update (done) on public.order_items to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
-- Kitchen may only flip availability; admins edit the rest via their own policy.
create or replace function public.guard_menu_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  keep boolean;
begin
  if (select public.staff_role()) = 'kitchen' then
    keep := new.available;
    new := old;
    new.available := keep;
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger menu_items_guard before update on public.menu_items
for each row execute function public.guard_menu_item_update();

-- ---------------------------------------------------------------- Realtime
alter publication supabase_realtime add table public.orders, public.order_items, public.booking_requests, public.notifications, public.menu_items;
