-- FITTEST production: horario oficial, modo Coach y compatibilidad del panel operativo.
-- Idempotente: puede ejecutarse nuevamente sin duplicar horarios.

begin;

create or replace function public.is_coach_or_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'coach')
  );
$$;

revoke all on function public.is_coach_or_admin() from public;
grant execute on function public.is_coach_or_admin() to authenticated, service_role;

-- El horario publicado queda limitado a los bloques confirmados por FITTEST.
update public.class_schedule set active = false where active = true;

insert into public.class_schedule (day_of_week, time, class_name, coach, max_spots, active)
values
  (1, '09:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '10:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '11:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '12:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '17:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '18:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '19:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '20:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (1, '21:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '09:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '10:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '11:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '12:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '17:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '18:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '19:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '20:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '21:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (2, '18:00', 'Hyrox', 'Por definir', 15, true),
  (2, '19:00', 'Hyrox', 'Por definir', 15, true),
  (3, '09:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '10:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '11:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '12:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '17:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '18:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '19:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '20:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (3, '21:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '09:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '10:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '11:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '12:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '17:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '18:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '19:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '20:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '21:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (4, '18:00', 'Hyrox', 'Por definir', 15, true),
  (4, '19:00', 'Hyrox', 'Por definir', 15, true),
  (5, '09:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '10:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '11:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '12:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '17:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '18:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '19:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '20:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (5, '21:00', 'CrossFit y personalizado', 'Por definir', 15, true),
  (6, '10:00', 'CrossFit y personalizado', 'Por definir', 15, true)
on conflict (day_of_week, time, class_name) do update set
  coach = excluded.coach,
  max_spots = excluded.max_spots,
  active = true,
  updated_at = now();

create table if not exists public.coach_private_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  note_type text not null check (note_type in ('scaling', 'technical', 'limitation', 'follow_up')),
  content text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coach_private_notes enable row level security;
drop policy if exists "Staff manage private coach notes" on public.coach_private_notes;
create policy "Staff manage private coach notes" on public.coach_private_notes
for all to authenticated
using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create table if not exists public.reservation_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  previous_status text,
  new_status text not null,
  previous_arrival_status text,
  new_arrival_status text,
  reason text,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

alter table public.reservation_attendance_audit enable row level security;
drop policy if exists "Staff read attendance audit" on public.reservation_attendance_audit;
create policy "Staff read attendance audit" on public.reservation_attendance_audit
for select to authenticated using (public.is_coach_or_admin());

drop function if exists public.coach_mark_attendance(uuid, boolean, text);
create or replace function public.coach_mark_attendance(
  target_reservation_id uuid,
  target_status text,
  target_arrival_status text default null,
  reason_input text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_record public.reservations;
  updated_record public.reservations;
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo coach o administración puede registrar asistencia.';
  end if;
  if target_status not in ('reserved', 'attended', 'no_show') then
    raise exception 'Estado de asistencia inválido.';
  end if;
  if target_arrival_status is not null and target_arrival_status not in ('on_time', 'late', 'rejected_for_safety') then
    raise exception 'Estado de llegada inválido.';
  end if;

  select * into current_record
  from public.reservations
  where id = target_reservation_id
  for update;

  if current_record.id is null or current_record.status = 'cancelled' then
    raise exception 'Reserva no encontrada o cancelada.';
  end if;

  update public.reservations
  set status = target_status,
      arrival_status = case when target_status = 'reserved' then null else target_arrival_status end,
      attendance_marked_at = now(),
      attendance_marked_by = auth.uid()
  where id = target_reservation_id
  returning * into updated_record;

  insert into public.reservation_attendance_audit (
    reservation_id, previous_status, new_status, previous_arrival_status,
    new_arrival_status, reason, changed_by
  ) values (
    current_record.id, current_record.status, updated_record.status,
    current_record.arrival_status, updated_record.arrival_status,
    nullif(trim(reason_input), ''), auth.uid()
  );

  return updated_record;
end;
$$;

drop function if exists public.admin_cancel_reservation(uuid, text);
create function public.admin_cancel_reservation(
  target_reservation_id uuid,
  cancellation_reason text default 'Cancelación operativa desde Modo Coach'
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_record public.reservations;
  class_time time;
  refundable boolean;
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo administración o coach puede cancelar esta reserva.';
  end if;

  select * into reservation_record
  from public.reservations
  where id = target_reservation_id
  for update;

  if reservation_record.id is null or reservation_record.status = 'cancelled' then
    raise exception 'Reserva no encontrada o ya cancelada.';
  end if;

  select time into class_time from public.class_schedule where id = reservation_record.class_schedule_id;
  refundable := reservation_record.token_charged
    and now() <= ((reservation_record.reservation_date::timestamp + class_time) at time zone 'America/Santiago') - interval '30 minutes';

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = nullif(trim(admin_cancel_reservation.cancellation_reason), ''),
      cancellation_kind = case when refundable then 'timely' else 'late' end,
      token_refunded = refundable
  where id = reservation_record.id
  returning * into reservation_record;

  if refundable and reservation_record.membership_id is not null then
    update public.memberships
    set classes_used = greatest(classes_used - 1, 0)
    where id = reservation_record.membership_id;

    insert into public.membership_token_movements (
      membership_id, profile_id, reservation_id, movement_type, quantity, reason, created_by
    ) values (
      reservation_record.membership_id, reservation_record.profile_id, reservation_record.id,
      'refund', 1, 'Cancelación desde Modo Coach', auth.uid()
    );
  end if;

  return reservation_record;
end;
$$;

create or replace function public.coach_get_manual_reservation_profiles()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo admin o coach activo puede buscar alumnos.';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, full_name, email, phone, level, status
      from public.profiles
      where role in ('student', 'admin', 'coach')
      order by full_name asc nulls last
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.coach_get_manual_reservation_memberships()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo admin o coach activo puede revisar membresías.';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'profile_id', m.profile_id,
        'plan_id', m.plan_id,
        'start_date', m.start_date,
        'end_date', m.end_date,
        'status', m.status,
        'classes_total', m.classes_total,
        'classes_used', m.classes_used,
        'payment_status', m.payment_status,
        'plan', jsonb_build_object('name', pl.name, 'is_unlimited', pl.is_unlimited)
      ) order by m.end_date desc nulls last
    )
    from public.memberships m
    left join public.plans pl on pl.id = m.plan_id
    where m.status = 'active'
      and m.payment_status = 'paid'
      and m.start_date <= current_date
      and m.end_date >= current_date
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
          'class_name', cs.class_name, 'coach', cs.coach, 'max_spots', cs.max_spots
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

revoke all on function public.coach_mark_attendance(uuid, text, text, text) from public;
revoke all on function public.admin_cancel_reservation(uuid, text) from public;
revoke all on function public.coach_get_manual_reservation_profiles() from public;
revoke all on function public.coach_get_manual_reservation_memberships() from public;
revoke all on function public.coach_get_day_reservations(date) from public;

grant execute on function public.coach_mark_attendance(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.admin_cancel_reservation(uuid, text) to authenticated, service_role;
grant execute on function public.coach_get_manual_reservation_profiles() to authenticated, service_role;
grant execute on function public.coach_get_manual_reservation_memberships() to authenticated, service_role;
grant execute on function public.coach_get_day_reservations(date) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from public.profiles
    where lower(email) = 'vaas.arismendi@gmail.com'
      and status = 'active'
      and role in ('admin', 'coach')
  ) then
    raise exception 'El usuario vaas.arismendi@gmail.com no tiene un perfil activo de administración o coach.';
  end if;
end $$;

commit;

-- Comprobación esperada: 50 bloques activos, todos con 15 cupos.
select
  count(*) as active_schedule_blocks,
  count(*) filter (where class_name = 'Hyrox') as hyrox_blocks,
  min(max_spots) as minimum_capacity,
  max(max_spots) as maximum_capacity
from public.class_schedule
where active = true;
