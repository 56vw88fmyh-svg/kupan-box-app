-- Modo Coach KUPAN.
-- Ejecutar en Supabase SQL Editor para permitir que roles admin/coach vean y marquen asistencia.
-- Si solo usas admins, la app tambien puede operar con las funciones admin existentes.

create or replace function public.is_coach_or_admin()
returns boolean
language sql
security definer
set search_path = public
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

create or replace function public.coach_get_day_reservations(target_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
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
        'cancelled_at', r.cancelled_at,
        'created_at', r.created_at,
        'profile', jsonb_build_object(
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone
        ),
        'class_schedule', jsonb_build_object(
          'id', cs.id,
          'day_of_week', cs.day_of_week,
          'time', cs.time,
          'class_name', cs.class_name,
          'coach', cs.coach,
          'max_spots', cs.max_spots
        )
      )
      order by cs.time asc nulls last, p.full_name
    )
    from public.reservations r
    left join public.profiles p on p.id = r.profile_id
    left join public.class_schedule cs on cs.id = r.class_schedule_id
    where r.reservation_date = target_date
      and r.status <> 'cancelled'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_mark_reservation(
  target_reservation_id uuid,
  target_status text
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_reservation public.reservations;
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo admin o coach puede marcar asistencia.';
  end if;

  if target_status not in ('attended', 'no_show') then
    raise exception 'Estado de asistencia invalido.';
  end if;

  update public.reservations
  set status = target_status
  where id = target_reservation_id
    and status in ('reserved', 'attended', 'no_show')
  returning * into updated_reservation;

  if updated_reservation.id is null then
    raise exception 'Reserva no encontrada o ya cancelada.';
  end if;

  return updated_reservation;
end;
$$;

create or replace function public.cancel_reservation(target_reservation_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_record public.reservations;
  updated_reservation public.reservations;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para cancelar.';
  end if;

  select * into reservation_record
  from public.reservations
  where id = target_reservation_id
  for update;

  if reservation_record.id is null then
    raise exception 'Reserva no encontrada.';
  end if;

  if auth.uid() <> reservation_record.profile_id and not public.is_coach_or_admin() then
    raise exception 'Solo puedes cancelar tus propias reservas.';
  end if;

  if reservation_record.status in ('attended', 'no_show') then
    raise exception 'Esta reserva ya fue marcada como asistencia o no show. El token queda consumido.';
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now()
  where id = target_reservation_id
  returning * into updated_reservation;

  if reservation_record.status = 'reserved'
    and reservation_record.token_charged = true
    and reservation_record.membership_id is not null
    and reservation_record.reservation_date >= current_date then
    update public.memberships
    set classes_used = greatest(classes_used - 1, 0)
    where id = reservation_record.membership_id;

    insert into public.membership_token_movements (
      membership_id,
      profile_id,
      reservation_id,
      movement_type,
      quantity,
      reason,
      created_by
    )
    values (
      reservation_record.membership_id,
      reservation_record.profile_id,
      reservation_record.id,
      'refund',
      1,
      'Cancelacion antes de clase',
      auth.uid()
    );
  end if;

  return updated_reservation;
end;
$$;

grant execute on function public.is_coach_or_admin() to authenticated;
grant execute on function public.coach_get_day_reservations(date) to authenticated;
grant execute on function public.admin_mark_reservation(uuid, text) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
