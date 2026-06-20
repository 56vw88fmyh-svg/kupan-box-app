-- KUPAN Box App - Personal Records persistent schema
-- Safe/idempotent migration for Supabase/PostgreSQL.
-- Does not drop tables, columns, policies or data.
-- Apply manually in Supabase SQL Editor after backup.

begin;

create extension if not exists pgcrypto;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  category text,
  default_unit text,
  record_type text,
  comparison_type text not null default 'higher_is_better',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_name_not_blank check (length(btrim(name)) > 0),
  constraint exercises_normalized_name_not_blank check (length(btrim(normalized_name)) > 0),
  constraint exercises_comparison_type_valid check (
    comparison_type in (
      'higher_is_better',
      'lower_is_better',
      'rounds_reps',
      'distance',
      'calories',
      'custom'
    )
  )
);

-- Create the modern table when it does not exist yet.
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  record_type text not null,
  value numeric,
  value_text text,
  unit text,
  rounds integer,
  reps integer,
  time_seconds integer,
  achieved_at date not null,
  notes text,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_records_exercise_name_not_blank check (length(btrim(exercise_name)) > 0),
  constraint personal_records_record_type_not_blank check (length(btrim(record_type)) > 0),
  constraint personal_records_has_result check (
    value is not null
    or nullif(btrim(coalesce(value_text, '')), '') is not null
    or rounds is not null
    or reps is not null
    or time_seconds is not null
  ),
  constraint personal_records_value_not_negative check (value is null or value >= 0),
  constraint personal_records_time_not_negative check (time_seconds is null or time_seconds >= 0),
  constraint personal_records_rounds_not_negative check (rounds is null or rounds >= 0),
  constraint personal_records_reps_not_negative check (reps is null or reps >= 0),
  constraint personal_records_achieved_at_reasonable check (achieved_at between date '1900-01-01' and current_date + interval '1 day')
);

-- If personal_records already existed with the previous app schema, add modern columns safely.
alter table public.personal_records add column if not exists user_id uuid;
alter table public.personal_records add column if not exists exercise_id uuid;
alter table public.personal_records add column if not exists exercise_name text;
alter table public.personal_records add column if not exists record_type text;
alter table public.personal_records add column if not exists value_text text;
alter table public.personal_records add column if not exists rounds integer;
alter table public.personal_records add column if not exists reps integer;
alter table public.personal_records add column if not exists time_seconds integer;
alter table public.personal_records add column if not exists achieved_at date;
alter table public.personal_records add column if not exists source text default 'app';
alter table public.personal_records add column if not exists created_at timestamptz default now();
alter table public.personal_records add column if not exists updated_at timestamptz default now();

-- Backfill from the previous KUPAN PR schema if those columns exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'personal_records' and column_name = 'profile_id'
  ) then
    update public.personal_records
    set user_id = coalesce(user_id, profile_id)
    where user_id is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'personal_records' and column_name = 'movement'
  ) then
    update public.personal_records
    set exercise_name = coalesce(nullif(btrim(exercise_name), ''), movement)
    where exercise_name is null or length(btrim(exercise_name)) = 0;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'personal_records' and column_name = 'record_date'
  ) then
    update public.personal_records
    set achieved_at = coalesce(achieved_at, record_date)
    where achieved_at is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'personal_records' and column_name = 'unit'
  ) then
    update public.personal_records
    set record_type = coalesce(
      nullif(btrim(record_type), ''),
      case
        when unit = 'tiempo' then 'time'
        when unit = 'reps' then 'reps'
        when unit = 'metros' then 'distance'
        when unit = 'calorias' then 'calories'
        else 'weight'
      end
    )
    where record_type is null or length(btrim(record_type)) = 0;
  else
    update public.personal_records
    set record_type = coalesce(nullif(btrim(record_type), ''), 'custom')
    where record_type is null or length(btrim(record_type)) = 0;
  end if;

  update public.personal_records
  set source = coalesce(nullif(btrim(source), ''), 'legacy_app')
  where source is null or length(btrim(source)) = 0;
end $$;

-- Add foreign keys only when they do not exist. Existing legacy rows are preserved.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_records_user_id_fkey'
      and conrelid = 'public.personal_records'::regclass
  ) then
    alter table public.personal_records
      add constraint personal_records_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_records_exercise_id_fkey'
      and conrelid = 'public.personal_records'::regclass
  ) then
    alter table public.personal_records
      add constraint personal_records_exercise_id_fkey
      foreign key (exercise_id) references public.exercises(id) on delete set null
      not valid;
  end if;
end $$;

-- Future-write constraints. NOT VALID preserves existing legacy rows while enforcing new/updated rows.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'personal_records_user_id_required' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_user_id_required check (user_id is not null) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_exercise_name_required' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_exercise_name_required check (exercise_name is not null and length(btrim(exercise_name)) > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_record_type_required' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_record_type_required check (record_type is not null and length(btrim(record_type)) > 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_achieved_at_required' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_achieved_at_required check (achieved_at is not null) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_has_any_result' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_has_any_result check (
      value is not null
      or nullif(btrim(coalesce(value_text, '')), '') is not null
      or rounds is not null
      or reps is not null
      or time_seconds is not null
    ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_value_non_negative' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_value_non_negative check (value is null or value >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_time_non_negative' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_time_non_negative check (time_seconds is null or time_seconds >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_rounds_non_negative' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_rounds_non_negative check (rounds is null or rounds >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_reps_non_negative' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_reps_non_negative check (reps is null or reps >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'personal_records_achieved_at_reasonable_v2' and conrelid = 'public.personal_records'::regclass) then
    alter table public.personal_records add constraint personal_records_achieved_at_reasonable_v2 check (achieved_at between date '1900-01-01' and current_date + interval '1 day') not valid;
  end if;
end $$;

-- Normalize existing exercise names when possible.
update public.exercises
set normalized_name = lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
where normalized_name is null or length(btrim(normalized_name)) = 0;

-- Seed the known KUPAN movements without overwriting existing exercises.
insert into public.exercises (name, normalized_name, category, default_unit, record_type, comparison_type, is_active)
values
  ('Back Squat', 'back squat', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Front Squat', 'front squat', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Overhead Squat', 'overhead squat', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Deadlift', 'deadlift', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Bench Press', 'bench press', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Strict Press', 'strict press', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Shoulder Press', 'shoulder press', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Push Press', 'push press', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Push Jerk', 'push jerk', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Split Jerk', 'split jerk', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Snatch', 'snatch', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Power Snatch', 'power snatch', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Hang Snatch', 'hang snatch', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Squat Snatch', 'squat snatch', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Clean', 'clean', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Power Clean', 'power clean', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Hang Clean', 'hang clean', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Squat Clean', 'squat clean', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Clean & Jerk', 'clean & jerk', 'olympic_lifting', 'kg', 'weight', 'higher_is_better', true),
  ('Thruster', 'thruster', 'strength', 'kg', 'weight', 'higher_is_better', true),
  ('Pull Up', 'pull up', 'gymnastics', 'reps', 'reps', 'higher_is_better', true),
  ('Chest To Bar', 'chest to bar', 'gymnastics', 'reps', 'reps', 'higher_is_better', true),
  ('Bar Muscle Up', 'bar muscle up', 'gymnastics', 'reps', 'reps', 'higher_is_better', true),
  ('Ring Muscle Up', 'ring muscle up', 'gymnastics', 'reps', 'reps', 'higher_is_better', true),
  ('Toes To Bar', 'toes to bar', 'gymnastics', 'reps', 'reps', 'higher_is_better', true),
  ('Handstand Push Up', 'handstand push up', 'gymnastics', 'reps', 'reps', 'higher_is_better', true),
  ('Handstand Walk', 'handstand walk', 'gymnastics', 'metros', 'distance', 'distance', true),
  ('Wall Ball', 'wall ball', 'conditioning', 'reps', 'reps', 'higher_is_better', true),
  ('Box Jump', 'box jump', 'conditioning', 'reps', 'reps', 'higher_is_better', true),
  ('Burpee', 'burpee', 'conditioning', 'reps', 'reps', 'higher_is_better', true),
  ('Double Under', 'double under', 'conditioning', 'reps', 'reps', 'higher_is_better', true),
  ('Row', 'row', 'cardio', 'metros', 'distance', 'distance', true),
  ('2K Row', '2k row', 'cardio', 'tiempo', 'time', 'lower_is_better', true),
  ('5K Row', '5k row', 'cardio', 'tiempo', 'time', 'lower_is_better', true),
  ('Run', 'run', 'cardio', 'metros', 'distance', 'distance', true),
  ('1K Run', '1k run', 'cardio', 'tiempo', 'time', 'lower_is_better', true),
  ('5K Run', '5k run', 'cardio', 'tiempo', 'time', 'lower_is_better', true),
  ('Assault Bike', 'assault bike', 'cardio', 'calorias', 'calories', 'calories', true),
  ('Ski Erg', 'ski erg', 'cardio', 'calorias', 'calories', 'calories', true),
  ('Farmer Carry', 'farmer carry', 'strength', 'metros', 'distance', 'distance', true),
  ('Sandbag Carry', 'sandbag carry', 'strength', 'metros', 'distance', 'distance', true),
  ('Fran', 'fran', 'benchmark', 'tiempo', 'time', 'lower_is_better', true),
  ('Grace', 'grace', 'benchmark', 'tiempo', 'time', 'lower_is_better', true),
  ('Isabel', 'isabel', 'benchmark', 'tiempo', 'time', 'lower_is_better', true),
  ('Helen', 'helen', 'benchmark', 'tiempo', 'time', 'lower_is_better', true),
  ('Annie', 'annie', 'benchmark', 'tiempo', 'time', 'lower_is_better', true),
  ('Diane', 'diane', 'benchmark', 'tiempo', 'time', 'lower_is_better', true),
  ('Cindy', 'cindy', 'benchmark', 'rounds_reps', 'rounds_reps', 'rounds_reps', true),
  ('Murph', 'murph', 'benchmark', 'tiempo', 'time', 'lower_is_better', true)
on conflict do nothing;

-- Link legacy PR to exercises by normalized name when possible.
update public.personal_records pr
set exercise_id = e.id
from public.exercises e
where pr.exercise_id is null
  and lower(regexp_replace(btrim(pr.exercise_name), '\s+', ' ', 'g')) = e.normalized_name;

create unique index if not exists exercises_normalized_name_unique_idx
on public.exercises (normalized_name);

create index if not exists exercises_active_normalized_name_idx
on public.exercises (is_active, normalized_name);

create index if not exists personal_records_user_id_idx
on public.personal_records (user_id);

create index if not exists personal_records_exercise_id_idx
on public.personal_records (exercise_id);

create index if not exists personal_records_achieved_at_idx
on public.personal_records (achieved_at desc);

create index if not exists personal_records_user_exercise_idx
on public.personal_records (user_id, exercise_id);

create index if not exists personal_records_exercise_name_search_idx
on public.personal_records (lower(regexp_replace(btrim(exercise_name), '\s+', ' ', 'g')));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_exercises_updated_at on public.exercises;
create trigger set_exercises_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

drop trigger if exists set_personal_records_updated_at on public.personal_records;
create trigger set_personal_records_updated_at
before update on public.personal_records
for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.personal_records enable row level security;

-- Own-record policies. These do not require custom roles.
drop policy if exists "Students read own PR" on public.personal_records;
create policy "Students read own PR"
on public.personal_records
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Students insert own PR" on public.personal_records;
create policy "Students insert own PR"
on public.personal_records
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Students update own PR" on public.personal_records;
create policy "Students update own PR"
on public.personal_records
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Students delete own PR" on public.personal_records;
create policy "Students delete own PR"
on public.personal_records
for delete
to authenticated
using (user_id = auth.uid());

-- Exercise catalog read policy.
drop policy if exists "Authenticated read active exercises" on public.exercises;
create policy "Authenticated read active exercises"
on public.exercises
for select
to authenticated
using (is_active = true);

-- Optional admin policies. Created only if the existing secure role helper is available.
do $$
begin
  if to_regprocedure('public.is_admin()') is not null then
    drop policy if exists "Admins read all PR" on public.personal_records;
    create policy "Admins read all PR"
    on public.personal_records
    for select
    to authenticated
    using (public.is_admin());

    drop policy if exists "Admins manage all PR" on public.personal_records;
    create policy "Admins manage all PR"
    on public.personal_records
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists "Admins manage exercises" on public.exercises;
    create policy "Admins manage exercises"
    on public.exercises
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

    drop policy if exists "Admins read all exercises" on public.exercises;
    create policy "Admins read all exercises"
    on public.exercises
    for select
    to authenticated
    using (public.is_admin());
  end if;
end $$;

commit;
