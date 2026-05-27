-- Ranking interno de PR KUPAN.
-- No modifica personal_records existente. Expone solo datos basicos para ranking.

create or replace function public.get_public_pr_ranking(
  movement_filter text default null,
  level_filter text default null,
  limit_count integer default 20
)
returns table (
  id uuid,
  profile_id uuid,
  full_name text,
  level text,
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
  with ranked as (
    select
      pr.id,
      pr.profile_id,
      p.full_name,
      p.level,
      pr.movement,
      pr.value,
      pr.unit,
      pr.record_date,
      pr.created_at,
      row_number() over (
        partition by pr.profile_id, pr.movement, pr.unit
        order by
          case when pr.unit = 'tiempo' then pr.value end asc nulls last,
          case when pr.unit <> 'tiempo' then pr.value end desc nulls last,
          pr.record_date desc
      ) as athlete_rank
    from public.personal_records pr
    join public.profiles p on p.id = pr.profile_id
    where p.status = 'active'
      and pr.value is not null
      and pr.value > 0
      and pr.record_date is not null
      and (movement_filter is null or movement_filter = '' or pr.movement = movement_filter)
      and (level_filter is null or level_filter = '' or p.level = level_filter)
  )
  select
    ranked.id,
    ranked.profile_id,
    ranked.full_name,
    ranked.level,
    ranked.movement,
    ranked.value,
    ranked.unit,
    ranked.record_date,
    ranked.created_at
  from ranked
  where athlete_rank = 1
  order by
    case when ranked.unit = 'tiempo' then ranked.value end asc nulls last,
    case when ranked.unit <> 'tiempo' then ranked.value end desc nulls last,
    ranked.record_date desc
  limit least(greatest(limit_count, 1), 50);
$$;

revoke all on function public.get_public_pr_ranking(text, text, integer) from public;
revoke all on function public.get_public_pr_ranking(text, text, integer) from anon;
grant execute on function public.get_public_pr_ranking(text, text, integer) to authenticated;
