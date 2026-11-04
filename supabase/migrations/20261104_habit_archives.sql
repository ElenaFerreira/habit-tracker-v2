-- Archivage des habitudes.
-- À exécuter une fois dans Supabase : Dashboard > SQL Editor.
--
-- Une habitude archivée garde ses coches et ses objectifs, mais ne compte plus
-- (flammes, stats, historique) à partir du jour de l'archivage.
-- Chaque archivage crée une période [archived_on, restored_on[ : on peut donc
-- restaurer l'habitude plus tard sans fausser les stats de la période de pause.

create table if not exists public.habit_archives (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  archived_on date not null,
  restored_on date,
  created_at timestamptz not null default now(),
  constraint habit_archives_period_check check (restored_on is null or restored_on >= archived_on)
);

-- Une seule période d'archive « ouverte » par habitude
create unique index if not exists habit_archives_one_open_per_habit
  on public.habit_archives (habit_id) where restored_on is null;

create index if not exists habit_archives_habit_id_idx on public.habit_archives (habit_id);

alter table public.habit_archives enable row level security;

drop policy if exists "habit_archives_select_own" on public.habit_archives;
create policy "habit_archives_select_own" on public.habit_archives
  for select using (auth.uid() = user_id);

drop policy if exists "habit_archives_insert_own" on public.habit_archives;
create policy "habit_archives_insert_own" on public.habit_archives
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

drop policy if exists "habit_archives_update_own" on public.habit_archives;
create policy "habit_archives_update_own" on public.habit_archives
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habit_archives_delete_own" on public.habit_archives;
create policy "habit_archives_delete_own" on public.habit_archives
  for delete using (auth.uid() = user_id);

-- Pour que l'API Supabase voie tout de suite la nouvelle relation habits -> habit_archives
notify pgrst, 'reload schema';
