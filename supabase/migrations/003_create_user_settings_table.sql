-- Migration: Create user_settings table
-- Description: Table pour stocker les paramètres utilisateur (objectif de steps journalier)

create table public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  daily_step_goal integer not null default 15000 check (daily_step_goal > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index pour les requêtes fréquentes
create index user_settings_user_id_idx on public.user_settings(user_id);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Policies
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function update_updated_at_column();

