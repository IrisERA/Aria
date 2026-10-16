-- ARIA feedback: run this once in Supabase → SQL Editor → New query → Run.
-- Anyone using ARIA (signed in or not) can send feedback. Nobody can read it through the app;
-- you read it in Supabase → Table Editor → feedback.

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  email text check (email is null or char_length(email) <= 200),
  user_id uuid default auth.uid(),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  device text check (device is null or char_length(device) <= 60)
);

alter table public.feedback enable row level security;

drop policy if exists "Anyone can send feedback" on public.feedback;
create policy "Anyone can send feedback" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
