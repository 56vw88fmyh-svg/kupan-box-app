-- Additive migration: legacy PR and WOD rows remain unchanged.
begin;
alter table public.wod add column if not exists training_details jsonb not null default '{}'::jsonb;
create table if not exists public.workout_results (
  id uuid primary key,
  profile_id uuid not null references auth.users(id) on delete cascade,
  movement text not null check (length(btrim(movement)) > 0),
  value numeric not null check (value >= 0),
  unit text not null check (unit in ('kg', 'reps', 'tiempo', 'metros', 'calorias')),
  record_date date not null,
  notes text,
  rounds integer check (rounds >= 0),
  reps integer check (reps >= 0),
  time_seconds integer check (time_seconds > 0),
  result_context jsonb not null,
  wod_id uuid generated always as ((result_context->>'wod_id')::uuid) stored references public.wod(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_context_valid check (
    jsonb_typeof(result_context) = 'object'
    and result_context ?& array['wod_id','version','level','result_type']
    and length(result_context->>'version') > 0
    and result_context->>'level' in ('Iniciado','Rookie','Scaled','RX')
    and result_context->>'result_type' in ('time','rounds_reps','load','distance','calories')
  ),
  constraint workout_score_valid check (
    case result_context->>'result_type'
      when 'rounds_reps' then unit = 'reps' and rounds is not null and reps is not null and rounds + reps > 0
      when 'time' then unit = 'tiempo' and time_seconds is not null and value = time_seconds
      when 'load' then unit = 'kg' and value > 0
      when 'distance' then unit = 'metros' and value > 0
      when 'calories' then unit = 'calorias' and value > 0
      else false end
  )
);
alter table public.workout_results enable row level security;
drop policy if exists workout_results_owner_read on public.workout_results;
create policy workout_results_owner_read on public.workout_results for select to authenticated using (profile_id = auth.uid());
drop policy if exists workout_results_owner_create on public.workout_results;
create policy workout_results_owner_create on public.workout_results for insert to authenticated with check (profile_id = auth.uid());
revoke all on public.workout_results from anon, authenticated;
grant select, insert on public.workout_results to authenticated;
create index if not exists workout_results_owner_date on public.workout_results(profile_id, record_date desc);

-- Explicit projection: no dependence on future private columns in wod.
create or replace function public.get_public_todays_wod_v2(target_date date default (timezone('America/Santiago', now()))::date)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('id', w.id, 'date', w.date, 'title', w.title, 'warmup', w.warmup,
 'strength', w.strength, 'workout', w.workout, 'time_cap', w.time_cap, 'notes', w.notes,
 'training_details', w.training_details, 'created_at', w.created_at, 'updated_at', w.updated_at)
 from public.wod w where w.date = target_date limit 1;
$$;
revoke all on function public.get_public_todays_wod_v2(date) from public;
grant execute on function public.get_public_todays_wod_v2(date) to anon, authenticated;
commit;
