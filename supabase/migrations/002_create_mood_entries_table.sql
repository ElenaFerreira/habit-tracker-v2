-- Migration: Create mood_entries table
-- Description: Table pour stocker l'humeur quotidienne de l'utilisateur
-- Options: best_day, good, moody, bad, awful

create table public.mood_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  mood text not null check (mood in ('best_day', 'good', 'moody', 'bad', 'awful')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Une seule entrée par jour par utilisateur
  unique(user_id, date)
);

-- Index pour les requêtes fréquentes
create index mood_entries_user_id_idx on public.mood_entries(user_id);
create index mood_entries_date_idx on public.mood_entries(date);
create index mood_entries_user_date_idx on public.mood_entries(user_id, date);

-- Enable RLS
alter table public.mood_entries enable row level security;

-- Policies
create policy "Users can view their own mood entries"
  on public.mood_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own mood entries"
  on public.mood_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own mood entries"
  on public.mood_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own mood entries"
  on public.mood_entries for delete
  using (auth.uid() = user_id);

