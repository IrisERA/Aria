-- ARIA "Share my list": run this once in Supabase → SQL Editor → New query → Run.
-- A shared list is a public, read-only copy that anyone with the link can view.
-- Only the owner can create, change or delete it. Viewers can only fetch one list by its
-- link code (through get_shared_list), so nobody can browse or list other people's shares.

create table if not exists public.shared_lists (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  owner_name text,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.shared_lists enable row level security;

drop policy if exists "Owners read their shares" on public.shared_lists;
create policy "Owners read their shares" on public.shared_lists
  for select to authenticated using ((select auth.uid()) = owner);

drop policy if exists "Owners add shares" on public.shared_lists;
create policy "Owners add shares" on public.shared_lists
  for insert to authenticated with check ((select auth.uid()) = owner);

drop policy if exists "Owners update their shares" on public.shared_lists;
create policy "Owners update their shares" on public.shared_lists
  for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);

drop policy if exists "Owners delete their shares" on public.shared_lists;
create policy "Owners delete their shares" on public.shared_lists
  for delete to authenticated using ((select auth.uid()) = owner);

-- Public read of a single shared list by its link code.
create or replace function public.get_shared_list(share_id text)
returns table (title text, owner_name text, items jsonb, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.title, s.owner_name, s.items, s.updated_at from public.shared_lists s where s.id = share_id;
$$;

revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated;
