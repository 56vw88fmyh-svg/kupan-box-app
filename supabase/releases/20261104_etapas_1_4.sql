-- Atomic application of the three reviewed migrations; no historical migrations are replayed.
begin;
set local lock_timeout='5s';
-- 20261104120000_training_reliability.sql
-- Additive migration: legacy PR and WOD rows remain unchanged.

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

-- 20261104140000_metrics_and_member_privacy.sql

create table if not exists public.athlete_preferences (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  weekly_goal smallint check (weekly_goal between 1 and 14),
  community_alias text not null default '' check (length(community_alias) <= 40),
  share_attendance boolean not null default false,
  share_records boolean not null default false,
  share_birthday boolean not null default false,
  constraint sharing_requires_alias check (not (share_attendance or share_records or share_birthday) or length(btrim(community_alias)) > 0)
);
alter table public.athlete_preferences enable row level security;
drop policy if exists own_preferences on public.athlete_preferences;
create policy own_preferences on public.athlete_preferences to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
revoke all on public.athlete_preferences from public, anon, authenticated;
grant select, insert, update on public.athlete_preferences to authenticated;

-- A projection for members, never a fallback to unrestricted profile/PR tables.
create or replace function public.get_member_community_feed()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb; today date := (now() at time zone 'America/Santiago')::date;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles where id = auth.uid() and status = 'active') then
    raise exception 'Member session required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'ranking', coalesce((select jsonb_agg(row_to_json(r)) from (
      select p.id profile_id, a.community_alias full_name, count(*) attendance_count
      from public.reservations res join public.profiles p on p.id = res.profile_id
      join public.athlete_preferences a on a.profile_id = p.id and a.share_attendance
      where p.status = 'active' and p.role not in ('admin','coach') and res.status = 'attended'
        and res.reservation_date between date_trunc('month',today)::date and today
      group by p.id, a.community_alias order by count(*) desc, a.community_alias, p.id limit 10
    ) r), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(row_to_json(r)) from (
      select pr.id, pr.profile_id, a.community_alias full_name, pr.movement, pr.value, pr.unit,
             pr.rounds, pr.reps, pr.time_seconds, pr.record_date, pr.created_at
      from public.personal_records pr join public.profiles p on p.id = pr.profile_id
      join public.athlete_preferences a on a.profile_id = p.id and a.share_records
      where p.status = 'active' and p.role not in ('admin','coach') and pr.movement not ilike 'WOD:%'
      order by pr.created_at desc, pr.id limit 5
    ) r), '[]'::jsonb),
    'birthdays', coalesce((select jsonb_agg(row_to_json(r)) from (
      select p.id profile_id, a.community_alias full_name,
             extract(day from p.birth_date)::int birth_day, extract(month from p.birth_date)::int birth_month
      from public.profiles p join public.athlete_preferences a on a.profile_id = p.id and a.share_birthday
      where p.status = 'active' and p.role not in ('admin','coach') and extract(month from p.birth_date) = extract(month from today)
      order by extract(day from p.birth_date),a.community_alias
    ) r), '[]'::jsonb),
    'news', coalesce((select jsonb_agg(row_to_json(r)) from (
      select id, type, title, content, event_date, created_at from public.community_posts
      where active order by created_at desc, id limit 10
    ) r), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_member_community_feed() from public, anon;
grant execute on function public.get_member_community_feed() to authenticated;

-- Close old RPC paths too. Keep their signatures for existing clients and admin tools.
-- Originals move behind owner-only permissions; wrappers enforce current privacy rules.
do $$
declare f record; original text; args text; result_type text; forwarding text; columns text; body text;
begin
 for f in select p.*, n.nspname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('get_public_good_vibes_ranking','get_public_recent_prs','get_public_pr_ranking','birthdays_this_month','upcoming_birthdays')
 loop
  original := 'stage2_private_' || f.proname;
  args := pg_get_function_arguments(f.oid);
  result_type := pg_get_function_result(f.oid);
  select coalesce(string_agg('$' || i::text, ', '),'') into forwarding from generate_series(1, f.pronargs) i;
  if to_regprocedure(format('public.%I(%s)',original,oidvectortypes(f.proargtypes))) is null then
    execute format('alter function public.%I(%s) rename to %I',f.proname,pg_get_function_identity_arguments(f.oid),original);
  end if;
  execute format('revoke all on function public.%I(%s) from public, anon, authenticated',original,pg_get_function_identity_arguments(f.oid));
  if f.proname in ('birthdays_this_month','upcoming_birthdays') then
    body := format('select x.* from public.%I(%s) x where public.is_admin()',original,forwarding);
  elsif f.proname = 'get_public_good_vibes_ranking' then
    body := 'select p.id, a.community_alias, count(*) from public.reservations r join public.profiles p on p.id=r.profile_id join public.athlete_preferences a on a.profile_id=p.id and a.share_attendance where exists(select 1 from public.profiles caller where caller.id=auth.uid() and caller.status=''active'') and p.status=''active'' and p.role not in (''admin'',''coach'') and r.status=''attended'' and r.reservation_date between $1 and least($2,(now() at time zone ''America/Santiago'')::date) group by p.id,a.community_alias order by count(*) desc,a.community_alias,p.id limit 10';
  else
    select string_agg(case when name = 'full_name' then 'a.community_alias' else format('x.%I',name) end, ', ' order by ord)
      into columns from unnest(f.proargnames, f.proargmodes) with ordinality fields(name,mode,ord) where mode in ('t','o');
    body := format('select %s from public.%I(%s) x join public.athlete_preferences a on a.profile_id=x.profile_id and a.share_records join public.profiles p on p.id=x.profile_id where exists(select 1 from public.profiles caller where caller.id=auth.uid() and caller.status=''active'') and p.status=''active'' and p.role not in (''admin'',''coach'') and x.movement not ilike ''WOD:%%''',columns,original,forwarding);
  end if;
  execute format('create or replace function public.%I(%s) returns %s language sql stable security definer set search_path = public as %L',f.proname,args,result_type,body);
  execute format('revoke all on function public.%I(%s) from public, anon',f.proname,pg_get_function_identity_arguments(f.oid));
  execute format('grant execute on function public.%I(%s) to authenticated',f.proname,pg_get_function_identity_arguments(f.oid));
 end loop;
end $$;

-- 20261104160000_training_session_metrics.sql

alter table public.workout_results add column if not exists rpe smallint;
alter table public.workout_results add column if not exists duration_minutes numeric;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.workout_results'::regclass and conname='workout_rpe_range') then
  alter table public.workout_results add constraint workout_rpe_range check(rpe between 1 and 10);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.workout_results'::regclass and conname='workout_duration_range') then
  alter table public.workout_results add constraint workout_duration_range check(duration_minutes > 0 and duration_minutes <= 600);
 end if;
end $$;
-- Existing owner-only RLS and grants remain unchanged; no backfill invents missing effort.

do $$ begin
 if has_table_privilege('anon','public.workout_results','SELECT') or has_table_privilege('anon','public.athlete_preferences','SELECT') or has_table_privilege('authenticated','public.workout_results','UPDATE') or has_function_privilege('anon','public.get_member_community_feed()','EXECUTE') then raise exception 'Unexpected training privileges'; end if;
end $$;
insert into supabase_migrations.schema_migrations(version,name,statements) values
('20261104120000','training_reliability',array[current_query()]),
('20261104140000','metrics_and_member_privacy',array[current_query()]),
('20261104160000','training_session_metrics',array[current_query()]) on conflict(version) do nothing;
commit;
