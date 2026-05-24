-- Feed publico limitado para WOD y Comunidad KUPAN.
-- Ejecutar en Supabase SQL Editor.
-- Estas funciones exponen solo datos necesarios para alumnos, sin abrir tablas completas.

create or replace function public.get_public_todays_wod(
  target_date date default (timezone('America/Santiago', now()))::date
)
returns table (
  id uuid,
  date date,
  title text,
  warmup text,
  strength text,
  workout text,
  time_cap text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    w.id,
    w.date,
    w.title,
    w.warmup,
    w.strength,
    w.workout,
    w.time_cap,
    w.notes,
    w.created_at,
    w.updated_at
  from public.wod w
  where w.date = target_date
  limit 1;
$$;

create or replace function public.get_public_good_vibes_ranking(
  month_start date default date_trunc('month', timezone('America/Santiago', now()))::date,
  month_end date default (date_trunc('month', timezone('America/Santiago', now())) + interval '1 month - 1 day')::date
)
returns table (
  profile_id uuid,
  full_name text,
  reservations_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as profile_id,
    p.full_name,
    count(r.id) as reservations_count
  from public.reservations r
  join public.profiles p on p.id = r.profile_id
  where r.reservation_date between month_start and month_end
    and r.status in ('reserved', 'attended')
  group by p.id, p.full_name
  order by reservations_count desc, p.full_name
  limit 10;
$$;

create or replace function public.get_public_box_news(limit_count integer default 5)
returns table (
  id uuid,
  type text,
  title text,
  content text,
  event_date date,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cp.id,
    cp.type,
    cp.title,
    cp.content,
    cp.event_date,
    cp.created_at
  from public.community_posts cp
  where cp.active = true
    and coalesce(cp.type, '') <> 'evento'
  order by cp.created_at desc
  limit least(greatest(limit_count, 1), 10);
$$;

create or replace function public.get_public_recent_prs(limit_count integer default 5)
returns table (
  id uuid,
  profile_id uuid,
  full_name text,
  movement text,
  value numeric,
  unit text,
  record_date date,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    pr.id,
    pr.profile_id,
    p.full_name,
    pr.movement,
    pr.value,
    pr.unit,
    pr.record_date,
    pr.created_at
  from public.personal_records pr
  join public.profiles p on p.id = pr.profile_id
  order by pr.created_at desc
  limit least(greatest(limit_count, 1), 10);
$$;

grant execute on function public.get_public_todays_wod(date) to anon, authenticated;
grant execute on function public.get_public_good_vibes_ranking(date, date) to anon, authenticated;
grant execute on function public.get_public_box_news(integer) to anon, authenticated;
grant execute on function public.get_public_recent_prs(integer) to anon, authenticated;
