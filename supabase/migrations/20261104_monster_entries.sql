-- Suivi de la consommation de Monster : une ligne = un jour où j'en ai bu.
-- À exécuter une fois dans Supabase : Dashboard > SQL Editor.

create table if not exists public.monster_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  constraint monster_entries_user_date_key unique (user_id, date)
);

alter table public.monster_entries enable row level security;

drop policy if exists "monster_entries_select_own" on public.monster_entries;
create policy "monster_entries_select_own" on public.monster_entries
  for select using (auth.uid() = user_id);

drop policy if exists "monster_entries_insert_own" on public.monster_entries;
create policy "monster_entries_insert_own" on public.monster_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "monster_entries_delete_own" on public.monster_entries;
create policy "monster_entries_delete_own" on public.monster_entries
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
