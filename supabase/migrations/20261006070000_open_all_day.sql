-- Admin "open all day today" switch (Budapest calendar date), for testing and special days.
alter table public.settings add column if not exists open_all_day_date date;
