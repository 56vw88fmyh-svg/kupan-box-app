-- Funciones de cumpleaños KUPAN.
-- Ejecutar en Supabase SQL Editor si quieres edad y mes disponibles en la app.

create or replace function public.birthdays_this_month()
returns table (
  profile_id uuid,
  full_name text,
  birth_day integer,
  birth_month integer,
  turning_age integer,
  level text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    extract(day from p.birth_date)::integer as birth_day,
    extract(month from p.birth_date)::integer as birth_month,
    (extract(year from current_date)::integer - extract(year from p.birth_date)::integer) as turning_age,
    p.level
  from public.profiles p
  where p.status = 'active'
    and extract(month from p.birth_date) = extract(month from current_date)
  order by extract(day from p.birth_date), p.full_name;
$$;

create or replace function public.upcoming_birthdays(days_ahead integer default 30)
returns table (
  profile_id uuid,
  full_name text,
  phone text,
  birth_day integer,
  birth_month integer,
  turning_age integer,
  days_until integer,
  level text
)
language sql
security definer
set search_path = public
as $$
  with birthdays as (
    select
      p.id,
      p.full_name,
      p.phone,
      p.birth_date,
      p.level,
      make_date(
        extract(year from current_date)::integer,
        extract(month from p.birth_date)::integer,
        extract(day from p.birth_date)::integer
      ) as birthday_this_year
    from public.profiles p
    where p.status = 'active'
  ),
  normalized as (
    select
      b.*,
      case
        when b.birthday_this_year < current_date
          then b.birthday_this_year + interval '1 year'
        else b.birthday_this_year
      end::date as next_birthday
    from birthdays b
  )
  select
    n.id,
    n.full_name,
    n.phone,
    extract(day from n.birth_date)::integer as birth_day,
    extract(month from n.birth_date)::integer as birth_month,
    (extract(year from n.next_birthday)::integer - extract(year from n.birth_date)::integer) as turning_age,
    (n.next_birthday - current_date)::integer as days_until,
    n.level
  from normalized n
  where (n.next_birthday - current_date)::integer between 0 and days_ahead
  order by days_until, n.full_name;
$$;
