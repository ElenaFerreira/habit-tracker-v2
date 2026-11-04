-- Budget mensuel : dépenses et revenus récurrents, cochés chaque mois.
-- À exécuter une fois dans Supabase : Dashboard > SQL Editor.

-- 1. Lignes de budget récurrentes (loyer, électricité, salaire...)
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  amount numeric(10, 2) not null check (amount >= 0), -- montant prévu
  is_variable boolean not null default false,          -- montant réel saisi au moment de cocher
  day_of_month smallint check (day_of_month between 1 and 31), -- facultatif
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Paiements : une ligne = une dépense payée / un revenu reçu pour un mois donné
create table if not exists public.budget_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.budget_items(id) on delete cascade,
  month date not null check (extract(day from month) = 1), -- premier jour du mois
  amount numeric(10, 2) not null check (amount >= 0),       -- montant réel
  paid_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint budget_payments_item_month_key unique (item_id, month)
);

create index if not exists budget_payments_user_month_idx on public.budget_payments (user_id, month);

alter table public.budget_items enable row level security;
alter table public.budget_payments enable row level security;

drop policy if exists "budget_items_all_own" on public.budget_items;
create policy "budget_items_all_own" on public.budget_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budget_payments_select_own" on public.budget_payments;
create policy "budget_payments_select_own" on public.budget_payments
  for select using (auth.uid() = user_id);

drop policy if exists "budget_payments_insert_own" on public.budget_payments;
create policy "budget_payments_insert_own" on public.budget_payments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.budget_items i where i.id = item_id and i.user_id = auth.uid())
  );

drop policy if exists "budget_payments_delete_own" on public.budget_payments;
create policy "budget_payments_delete_own" on public.budget_payments
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
