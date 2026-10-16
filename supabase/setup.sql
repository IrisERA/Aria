-- ARIA cloud sync: run this once in Supabase → SQL Editor → New query → Run.
-- One row per signed-in user holding their titles, lists and settings.
-- Row Level Security makes sure each person can only read and change their own row.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  titles jsonb not null default '[]',
  lists jsonb not null default '[]',
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Users read their own data" on public.user_data;
create policy "Users read their own data" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own data" on public.user_data;
create policy "Users add their own data" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own data" on public.user_data;
create policy "Users update their own data" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own data" on public.user_data;
create policy "Users delete their own data" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);
