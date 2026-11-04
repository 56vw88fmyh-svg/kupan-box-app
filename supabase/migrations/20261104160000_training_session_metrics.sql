begin;
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
commit;
