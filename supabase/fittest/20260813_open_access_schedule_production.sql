-- FITTEST production: rangos de acceso abierto y clases Hyrox confirmadas.
-- Idempotente: puede ejecutarse nuevamente sin duplicar horarios.

begin;

alter table public.class_schedule
  add column if not exists end_time time,
  add column if not exists is_open_access boolean not null default false,
  add column if not exists unlimited_capacity boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.class_schedule'::regclass
      and conname = 'class_schedule_end_after_start'
  ) then
    alter table public.class_schedule
      add constraint class_schedule_end_after_start
      check (end_time is null or end_time > time);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.class_schedule'::regclass
      and conname = 'class_schedule_open_access_has_end'
  ) then
    alter table public.class_schedule
      add constraint class_schedule_open_access_has_end
      check (not is_open_access or end_time is not null);
  end if;
end $$;

-- Solo quedan activos los 15 bloques confirmados por FITTEST.
update public.class_schedule set active = false where active = true;

insert into public.class_schedule (
  day_of_week, time, end_time, class_name, coach, max_spots,
  is_open_access, unlimited_capacity, active
)
values
  (1, '09:00', '13:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (1, '17:00', '22:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (2, '09:00', '13:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (2, '17:00', '22:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (2, '18:00', '19:00', 'Hyrox', 'Por definir', 15, false, false, true),
  (2, '19:00', '20:00', 'Hyrox', 'Por definir', 15, false, false, true),
  (3, '09:00', '13:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (3, '17:00', '22:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (4, '09:00', '13:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (4, '17:00', '22:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (4, '18:00', '19:00', 'Hyrox', 'Por definir', 15, false, false, true),
  (4, '19:00', '20:00', 'Hyrox', 'Por definir', 15, false, false, true),
  (5, '09:00', '13:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (5, '17:00', '22:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true),
  (6, '10:00', '14:00', 'CrossFit y personalizado', 'Por definir', 15, true, true, true)
on conflict (day_of_week, time, class_name) do update set
  end_time = excluded.end_time,
  coach = excluded.coach,
  max_spots = excluded.max_spots,
  is_open_access = excluded.is_open_access,
  unlimited_capacity = excluded.unlimited_capacity,
  active = true,
  updated_at = now();

create or replace function public.available_spots(class_id uuid, target_date date)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when cs.unlimited_capacity then 2147483647
    else greatest(cs.max_spots - count(r.id)::integer, 0)
  end
  from public.class_schedule cs
  left join public.reservations r on r.class_schedule_id = cs.id
    and r.reservation_date = target_date
    and r.status in ('reserved', 'attended', 'no_show')
  where cs.id = class_id
  group by cs.max_spots, cs.unlimited_capacity;
$$;

create or replace function public.reserve_class(
  target_profile_id uuid,
  target_class_schedule_id uuid,
  target_reservation_date date
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  membership_row record;
  class_row public.class_schedule;
  reservation_row public.reservations;
  charged boolean;
begin
  if auth.uid() is null or (auth.uid() <> target_profile_id and not public.is_admin()) then
    raise exception 'Solo puedes reservar con tu propio perfil.';
  end if;

  select * into class_row
  from public.class_schedule
  where id = target_class_schedule_id and active
  for update;

  if class_row.id is null then raise exception 'Clase no disponible.'; end if;
  if extract(isodow from target_reservation_date)::integer <> class_row.day_of_week then
    raise exception 'La fecha no corresponde al horario.';
  end if;
  if target_reservation_date < current_date then
    raise exception 'No puedes reservar una clase pasada.';
  end if;

  if class_row.is_open_access and class_row.end_time is not null then
    if now() >= ((target_reservation_date::timestamp + class_row.end_time) at time zone 'America/Santiago') then
      raise exception 'El bloque de acceso abierto ya finalizó.';
    end if;
  elsif now() > ((target_reservation_date::timestamp + class_row.time) at time zone 'America/Santiago') - interval '30 minutes' then
    raise exception 'Las reservas cierran 30 minutos antes.';
  end if;

  if public.available_spots(target_class_schedule_id, target_reservation_date) <= 0 then
    raise exception 'Clase completa.';
  end if;

  select * into membership_row
  from public.get_active_membership(target_profile_id)
  limit 1;

  if membership_row.id is null then
    raise exception 'Necesitas una membresia activa y pagada para reservar.';
  end if;

  charged := not membership_row.is_unlimited;
  if charged and membership_row.classes_used >= membership_row.classes_total then
    raise exception 'No tienes tokens disponibles.';
  end if;

  insert into public.reservations (
    profile_id, class_schedule_id, membership_id, reservation_date, token_charged
  ) values (
    target_profile_id, target_class_schedule_id, membership_row.id, target_reservation_date, charged
  ) returning * into reservation_row;

  if charged then
    update public.memberships
    set classes_used = classes_used + 1
    where id = membership_row.id;

    insert into public.membership_token_movements (
      membership_id, profile_id, reservation_id, movement_type, quantity, reason
    ) values (
      membership_row.id, target_profile_id, reservation_row.id,
      'charge', -1, 'Reserva de clase'
    );
  end if;

  return reservation_row;
end;
$$;

drop function if exists public.admin_get_schedule();
create function public.admin_get_schedule()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar horarios.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, day_of_week, time, end_time, class_name, coach, max_spots,
        is_open_access, unlimited_capacity, active
      from public.class_schedule
      order by day_of_week asc, time asc, class_name asc
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.coach_get_day_reservations(target_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo admin o coach activo puede cargar asistencia.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'profile_id', r.profile_id,
        'class_schedule_id', r.class_schedule_id,
        'membership_id', r.membership_id,
        'reservation_date', r.reservation_date,
        'status', r.status,
        'token_charged', r.token_charged,
        'token_refunded', r.token_refunded,
        'cancelled_at', r.cancelled_at,
        'notes', r.admin_note,
        'created_at', r.created_at,
        'profile', jsonb_build_object(
          'full_name', p.full_name, 'email', p.email, 'phone', p.phone
        ),
        'class_schedule', jsonb_build_object(
          'id', cs.id, 'day_of_week', cs.day_of_week, 'time', cs.time,
          'end_time', cs.end_time, 'class_name', cs.class_name, 'coach', cs.coach,
          'max_spots', cs.max_spots, 'is_open_access', cs.is_open_access,
          'unlimited_capacity', cs.unlimited_capacity
        )
      ) order by cs.time asc nulls last, p.full_name
    )
    from public.reservations r
    left join public.profiles p on p.id = r.profile_id
    left join public.class_schedule cs on cs.id = r.class_schedule_id
    where r.reservation_date = target_date
      and r.status <> 'cancelled'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_get_schedule() from public;
grant execute on function public.admin_get_schedule() to authenticated, service_role;
grant execute on function public.available_spots(uuid, date) to anon, authenticated, service_role;
grant execute on function public.reserve_class(uuid, uuid, date) to authenticated, service_role;
grant execute on function public.coach_get_day_reservations(date) to authenticated, service_role;

commit;

-- Comprobación esperada: 15 bloques, 11 abiertos sin límite y 4 Hyrox.
select
  count(*) as active_schedule_blocks,
  count(*) filter (where is_open_access and unlimited_capacity) as open_unlimited_blocks,
  count(*) filter (where class_name = 'Hyrox') as hyrox_blocks
from public.class_schedule
where active = true;
