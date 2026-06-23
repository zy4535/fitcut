-- Run once in Supabase (SQL Editor -> New query -> Run).
-- Adds the timezone preference column to your existing profiles table.
alter table public.profiles add column if not exists timezone text;
