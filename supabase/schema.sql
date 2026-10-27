-- =====================================================================
-- Spruce database schema
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Safe to re-run: it drops and recreates the app's tables.
-- =====================================================================

create extension if not exists btree_gist;

drop table if exists public.reviews cascade;
drop table if exists public.bookings cascade;
drop table if exists public.cleaners cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------
-- Profiles: one row per signed-up user (clients and cleaners alike)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  phone       text,
  created_at  timestamptz not null default now()
);

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Cleaners: public listings. user_id is null for seeded demo cleaners.
-- ---------------------------------------------------------------------
create table public.cleaners (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references auth.users on delete cascade,
  display_name      text not null check (char_length(display_name) between 2 and 60),
  bio               text not null default '' check (char_length(bio) <= 600),
  hourly_rate       int  not null check (hourly_rate between 40 and 500),
  suburb            text not null,
  city              text not null,
  lat               double precision not null,
  lng               double precision not null,
  services          text[] not null default '{}',
  years_experience  int not null default 0 check (years_experience between 0 and 60),
  is_available      boolean not null default true,
  -- Working schedule the cleaner chooses. Days: 0 = Sunday ... 6 = Saturday
  work_days         smallint[] not null default '{1,2,3,4,5,6}',
  work_start        time not null default '07:00',
  work_end          time not null default '17:00' check (work_end > work_start),
  is_demo           boolean not null default false,
  rating_avg        numeric(2,1) not null default 0,
  rating_count      int not null default 0,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------
create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references auth.users on delete cascade,
  cleaner_id      uuid not null references public.cleaners on delete cascade,
  service         text not null,
  scheduled_date  date not null,
  start_time      time not null,
  bedrooms        int  not null default 1 check (bedrooms between 1 and 8),
  bathrooms       int  not null default 1 check (bathrooms between 1 and 6),
  addons          text[] not null default '{}',
  hours           int  not null default 2 check (hours between 2 and 10),
  address         text not null check (char_length(address) between 5 and 200),
  notes           text not null default '' check (char_length(notes) <= 500),
  total_price     int  not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','cancelled','completed')),
  created_at      timestamptz not null default now()
);
create index on public.bookings (client_id);
create index on public.bookings (cleaner_id);

-- The time a booking occupies (computed after the insert trigger has set hours)
alter table public.bookings add column slot tsrange generated always as
  (tsrange(scheduled_date + start_time, scheduled_date + start_time + make_interval(hours => hours))) stored;

-- No double booking: one cleaner can't have two active bookings that overlap.
-- Enforced by the database itself, so it holds even if two people book at the same moment.
alter table public.bookings add constraint no_double_booking
  exclude using gist (cleaner_id with =, slot with &&)
  where (status in ('pending', 'accepted'));

-- ---------------------------------------------------------------------
-- Reviews: clients rate cleaners after a completed booking
-- ---------------------------------------------------------------------
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid unique references public.bookings on delete set null,
  client_id      uuid references auth.users on delete set null,
  cleaner_id     uuid not null references public.cleaners on delete cascade,
  reviewer_name  text not null default 'Spruce client',
  rating         int  not null check (rating between 1 and 5),
  comment        text not null default '' check (char_length(comment) <= 500),
  created_at     timestamptz not null default now()
);
create index on public.reviews (cleaner_id);

-- =====================================================================
-- Business rules (enforced in the database, not just the UI)
-- =====================================================================

-- Pricing: hours depend on service and home size; add-ons are fixed prices.
-- Keep in sync with src/lib/catalog.ts (the app shows the same quote).
create or replace function public.estimate_hours(svc text, beds int, baths int)
returns int language sql immutable as $$
  select least(10, greatest(2, ceil(
    case svc
      when 'Standard clean'     then 2 + 0.5 * (beds - 1) + 0.5  * (baths - 1)
      when 'Deep clean'         then 3 + 1.0 * (beds - 1) + 0.75 * (baths - 1)
      when 'Move-in / move-out' then 4 + 1.0 * (beds - 1) + 1.0  * (baths - 1)
      when 'Office clean'       then 3 + 0.5 * (beds - 1) + 0.5  * (baths - 1)
      when 'Laundry & ironing'  then 3
      when 'Windows'            then 2 + 0.5 * (beds - 1)
      else 3
    end)))::int
$$;

create or replace function public.addon_price(addon text)
returns int language sql immutable as $$
  select case addon
    when 'oven' then 120 when 'fridge' then 90 when 'cabinets' then 100
    when 'windows_in' then 150 when 'balcony' then 100 when 'ironing' then 110
    else null end
$$;

-- New booking: server works out hours and price; demo cleaners auto-accept
create or replace function public.before_booking_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.cleaners; extras int;
begin
  select * into c from public.cleaners where id = new.cleaner_id;
  if c.id is null then raise exception 'Cleaner not found'; end if;
  if c.user_id = new.client_id then raise exception 'You cannot book yourself'; end if;
  if not c.is_available then raise exception 'This cleaner is not taking bookings right now'; end if;
  if new.scheduled_date < current_date then raise exception 'Pick a date from today onwards'; end if;
  if not (new.service = any(c.services)) then raise exception 'This cleaner does not offer that service'; end if;
  if exists (select 1 from unnest(new.addons) a where public.addon_price(a) is null) then
    raise exception 'Unknown add-on';
  end if;

  new.addons := array(select distinct unnest(new.addons));
  select coalesce(sum(public.addon_price(a)), 0) into extras from unnest(new.addons) a;
  new.hours := public.estimate_hours(new.service, new.bedrooms, new.bathrooms);

  -- Must fit inside the cleaner's chosen working days and hours
  if not (extract(dow from new.scheduled_date)::smallint = any(c.work_days)) then
    raise exception '% doesn''t work on %s', c.display_name, trim(to_char(new.scheduled_date, 'Day'));
  end if;
  if new.start_time < c.work_start or new.start_time + make_interval(hours => new.hours) > c.work_end then
    raise exception '% works % to %, and this clean takes % hours', c.display_name,
      to_char(c.work_start, 'HH24:MI'), to_char(c.work_end, 'HH24:MI'), new.hours;
  end if;
  new.total_price := c.hourly_rate * new.hours + extras;
  new.status := case when c.is_demo then 'accepted' else 'pending' end;
  new.created_at := now();
  return new;
end $$;

create trigger booking_insert before insert on public.bookings
  for each row execute function public.before_booking_insert();

-- Status changes: only allowed transitions, by the right person
create or replace function public.before_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_client  boolean := (auth.uid() = old.client_id);
  is_cleaner boolean := exists (select 1 from public.cleaners where id = old.cleaner_id and user_id = auth.uid());
begin
  if new.status = old.status then return new; end if;

  if is_cleaner and old.status = 'pending'  and new.status in ('accepted','declined') then return new; end if;
  if is_cleaner and old.status = 'accepted' and new.status = 'completed' then return new; end if;
  if is_client  and old.status in ('pending','accepted') and new.status = 'cancelled' then return new; end if;
  if is_client  and old.status = 'accepted' and new.status = 'completed' then return new; end if;

  raise exception 'Cannot change a % booking to %', old.status, new.status;
end $$;

create trigger booking_update before update on public.bookings
  for each row execute function public.before_booking_update();

-- New review: must be the client's own completed booking; fill in name
create or replace function public.before_review_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  -- Seed data inserted from the SQL editor (no signed-in user, no booking)
  if new.booking_id is null and auth.uid() is null then return new; end if;

  select * into b from public.bookings where id = new.booking_id;
  if b.id is null or b.client_id <> auth.uid() then raise exception 'Booking not found'; end if;
  if b.status <> 'completed' then raise exception 'You can review a booking once it is completed'; end if;

  new.client_id  := b.client_id;
  new.cleaner_id := b.cleaner_id;
  select coalesce(nullif(split_part(full_name, ' ', 1), ''), 'Spruce client')
    into new.reviewer_name from public.profiles where id = b.client_id;
  new.created_at := now();
  return new;
end $$;

create trigger review_insert before insert on public.reviews
  for each row execute function public.before_review_insert();

-- Keep each cleaner's average rating up to date
create or replace function public.refresh_cleaner_rating(cid uuid)
returns void language sql security definer set search_path = public as $$
  update public.cleaners c set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where cleaner_id = cid), 0),
    rating_count = (select count(*) from public.reviews where cleaner_id = cid)
  where c.id = cid;
$$;

create or replace function public.after_review_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_cleaner_rating(new.cleaner_id);
  return new;
end $$;

create trigger review_rating after insert on public.reviews
  for each row execute function public.after_review_insert();

-- Busy times for a day: which cleaners are booked when. Returns times only,
-- never who booked or where, so the app can show who is free.
create or replace function public.busy_slots(day date)
returns table (cleaner_id uuid, start_time time, hours int)
language sql stable security definer set search_path = public as $$
  select b.cleaner_id, b.start_time, b.hours from public.bookings b
  where b.scheduled_date = day and b.status in ('pending', 'accepted')
$$;
grant execute on function public.busy_slots(date) to anon, authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.cleaners enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews  enable row level security;

-- Profiles: you see your own, and a cleaner sees clients who booked them
create policy "own profile" on public.profiles for select
  using (id = auth.uid());
create policy "cleaner sees their clients" on public.profiles for select
  using (exists (
    select 1 from public.bookings b join public.cleaners c on c.id = b.cleaner_id
    where b.client_id = profiles.id and c.user_id = auth.uid()));
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Cleaners: anyone can browse; you manage only your own listing
create policy "browse cleaners" on public.cleaners for select using (true);
create policy "create own listing" on public.cleaners for insert to authenticated
  with check (user_id = auth.uid() and is_demo = false and rating_count = 0 and rating_avg = 0);
create policy "edit own listing" on public.cleaners for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Bookings: visible to the client and the booked cleaner
create policy "see own bookings" on public.bookings for select to authenticated
  using (client_id = auth.uid()
      or exists (select 1 from public.cleaners c where c.id = cleaner_id and c.user_id = auth.uid()));
create policy "create booking" on public.bookings for insert to authenticated
  with check (client_id = auth.uid());
create policy "update own bookings" on public.bookings for update to authenticated
  using (client_id = auth.uid()
      or exists (select 1 from public.cleaners c where c.id = cleaner_id and c.user_id = auth.uid()));

-- Reviews: public to read; insert checked by trigger above
create policy "read reviews" on public.reviews for select using (true);
create policy "write review" on public.reviews for insert to authenticated
  with check (client_id = auth.uid());

-- Column-level permissions: users can't edit ratings, prices or ownership
revoke update on public.cleaners from anon, authenticated;
grant update (display_name, bio, hourly_rate, suburb, city, lat, lng, services, years_experience, is_available, work_days, work_start, work_end)
  on public.cleaners to authenticated;
revoke update on public.bookings from anon, authenticated;
grant update (status) on public.bookings to authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
