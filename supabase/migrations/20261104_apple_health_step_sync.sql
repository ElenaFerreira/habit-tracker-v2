-- Synchronisation automatique des pas depuis Apple Santé (via un Raccourci iOS).
-- À exécuter une fois dans Supabase : Dashboard > SQL Editor.

-- 1. Jeton personnel par utilisateur, utilisé par le Raccourci pour s'authentifier
alter table public.user_settings
  add column if not exists step_sync_token text unique;

-- 2. Fonction appelée par /api/steps/sync.
--    SECURITY DEFINER : elle contourne la RLS, mais n'écrit que pour l'utilisateur
--    à qui appartient le jeton.
create or replace function public.sync_steps_with_token(p_token text, p_date date, p_steps integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_entry_id uuid;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'invalid_token';
  end if;

  if p_steps is null or p_steps < 0 or p_steps > 200000 then
    raise exception 'invalid_steps';
  end if;

  select user_id into v_user_id
  from public.user_settings
  where step_sync_token = p_token;

  if v_user_id is null then
    raise exception 'invalid_token';
  end if;

  select id into v_entry_id
  from public.step_entries
  where user_id = v_user_id and date = p_date
  limit 1;

  if v_entry_id is not null then
    update public.step_entries set steps = p_steps where id = v_entry_id;
  else
    insert into public.step_entries (user_id, date, steps) values (v_user_id, p_date, p_steps);
  end if;
end;
$$;

revoke all on function public.sync_steps_with_token(text, date, integer) from public;
grant execute on function public.sync_steps_with_token(text, date, integer) to anon, authenticated;
