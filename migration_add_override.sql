-- Run this once in Supabase (SQL Editor -> New query -> Run).
-- Your profiles table already exists, so this just adds the new column.
alter table public.profiles
  add column if not exists override_safety boolean default false;
