-- ── FitCut database schema + row-level security ──
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.

create table if not exists public.profiles (
  user_id        uuid primary key references auth.users on delete cascade,
  mode           text not null default 'cut',
  sex            text not null default 'male',
  age            int,
  height_in      numeric,
  current_weight numeric,
  start_weight   numeric,
  activity       text not null default 'light',
  goal_weight    numeric,
  goal_date      date,
  override_safety boolean default false,
  timezone       text,
  updated_at     timestamptz default now()
);

create table if not exists public.weigh_ins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  weight     numeric not null,
  created_at timestamptz default now()
);

create table if not exists public.food_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  meal       text not null,
  name       text not null,
  unit       text,
  qty        numeric not null,
  kcal       numeric not null,
  protein    numeric default 0,
  carbs      numeric default 0,
  fat        numeric default 0,
  fiber      numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.cardio_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  activity   text not null,
  detail     text,
  kcal       numeric not null,
  created_at timestamptz default now()
);

-- Turn on row-level security so each user only sees their own rows.
alter table public.profiles   enable row level security;
alter table public.weigh_ins  enable row level security;
alter table public.food_log   enable row level security;
alter table public.cardio_log enable row level security;

-- One policy per table: you may read/write only rows you own.
create policy "own profiles"   on public.profiles   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weigh_ins"  on public.weigh_ins  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own food_log"   on public.food_log   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cardio_log" on public.cardio_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Helpful indexes for the per-day queries.
create index if not exists food_log_user_date   on public.food_log   (user_id, date);
create index if not exists cardio_log_user_date on public.cardio_log (user_id, date);
create index if not exists weigh_ins_user_date  on public.weigh_ins  (user_id, date);
