-- Migration: Create goals table
-- Description: Table pour stocker les objectifs utilisateur
-- Supports: quantitatifs (liés à une habitude), streak, et one-time (accomplissements uniques)

-- Supprimer la table si elle existe (pour recréer proprement)
DROP TABLE IF EXISTS public.goals;

create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade, -- NULLABLE: pour goals indépendants
  name text not null,
  type text not null check (type in ('quantitative', 'streak', 'one_time')),
  target_value integer not null default 1 check (target_value > 0),
  period text check (period in ('week', 'month', 'year', 'custom')),
  start_date date,
  end_date date,
  completed_at timestamp with time zone, -- Pour marquer quand un goal one_time est accompli
  icon text, -- Icône personnalisée pour les goals sans habitude
  reward text, -- Récompense optionnelle
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index pour les requêtes fréquentes
create index goals_user_id_idx on public.goals(user_id);
create index goals_habit_id_idx on public.goals(habit_id);

-- Enable RLS
alter table public.goals enable row level security;

-- Policies
create policy "Users can view their own goals"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.goals for delete
  using (auth.uid() = user_id);
