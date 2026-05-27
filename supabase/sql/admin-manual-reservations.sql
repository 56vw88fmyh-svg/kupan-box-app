-- Reserva manual de alumnos por admin/coach KUPAN.
-- Ejecutar despues de tokens-payments-reservations.sql y admin-rls-fix.sql.

alter table public.reservations
  add column if not exists notes text;

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

create or replace function public.admin_reserve_for_student(
  target_profile_id uuid,
  target_class_schedule_id uuid,
  target_reservation_date date,
  allow_without_membership boolean default false,
  admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  student_record public.profiles;
  schedule_record public.class_schedule;
  active_membership record;
  spots_left integer;
  remaining_tokens integer;
  should_charge_token boolean := false;
  new_reservation public.reservations;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion.';
  end if;

  if not public.is_coach_or_admin() then
    raise exception 'Solo admin o coach activo puede agregar alumnos manualmente a una clase.';
  end if;

  if allow_without_membership is true and not public.is_admin() then
    raise exception 'Solo admin puede reservar sin plan activo.';
  end if;

  select * into student_record
  from public.profiles
  where id = target_profile_id;

  if student_record.id is null then
    raise exception 'Alumno no encontrado.';
  end if;

  select * into schedule_record
  from public.class_schedule
  where id = target_class_schedule_id
    and active = true
  for update;

  if schedule_record.id is null then
    raise exception 'Clase no disponible.';
  end if;

  if target_reservation_date is null then
    raise exception 'Selecciona una fecha valida.';
  end if;

  select public.available_spots(target_class_schedule_id, target_reservation_date)
  into spots_left;

  if coalesce(spots_left, 0) <= 0 then
    raise exception 'Clase completa.';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.profile_id = target_profile_id
      and r.class_schedule_id = target_class_schedule_id
      and r.reservation_date = target_reservation_date
      and r.status = 'reserved'
  ) then
    raise exception 'El alumno ya tiene una reserva para esta clase.';
  end if;

  select * into active_membership
  from public.get_active_membership(target_profile_id)
  limit 1;

  if active_membership.id is null then
    if allow_without_membership is not true then
      raise exception 'El alumno no tiene plan activo.';
    end if;

    insert into public.reservations (
      profile_id,
      class_schedule_id,
      reservation_date,
      status,
      membership_id,
      token_charged,
      notes
    )
    values (
      target_profile_id,
      target_class_schedule_id,
      target_reservation_date,
      'reserved',
      null,
      false,
      coalesce(nullif(admin_note, ''), 'Reserva manual sin plan activo')
    )
    returning * into new_reservation;

    return jsonb_build_object(
      'id', new_reservation.id,
      'profile_id', new_reservation.profile_id,
      'class_schedule_id', new_reservation.class_schedule_id,
      'membership_id', new_reservation.membership_id,
      'reservation_date', new_reservation.reservation_date,
      'status', new_reservation.status,
      'token_charged', new_reservation.token_charged,
      'notes', new_reservation.notes,
      'profile', jsonb_build_object(
        'full_name', student_record.full_name,
        'email', student_record.email,
        'phone', student_record.phone
      ),
      'class_schedule', jsonb_build_object(
        'day_of_week', schedule_record.day_of_week,
        'time', schedule_record.time,
        'class_name', schedule_record.class_name,
        'coach', schedule_record.coach,
        'max_spots', schedule_record.max_spots
      )
    );
  end if;

  if active_membership.activated_at is not null
    and active_membership.activated_at::date + interval '30 days' < current_date then
    raise exception 'El plan del alumno esta vencido.';
  end if;

  if active_membership.is_unlimited is not true then
    remaining_tokens := public.membership_remaining_tokens(active_membership.id);

    if coalesce(remaining_tokens, 0) <= 0 then
      raise exception 'El alumno no tiene tokens disponibles.';
    end if;

    update public.memberships
    set classes_used = classes_used + 1
    where id = active_membership.id;

    should_charge_token := true;
  end if;

  insert into public.reservations (
    profile_id,
    class_schedule_id,
    reservation_date,
    status,
    membership_id,
    token_charged,
    notes
  )
  values (
    target_profile_id,
    target_class_schedule_id,
    target_reservation_date,
    'reserved',
    active_membership.id,
    should_charge_token,
    nullif(admin_note, '')
  )
  returning * into new_reservation;

  if should_charge_token then
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
      active_membership.id,
      target_profile_id,
      new_reservation.id,
      'charge',
      1,
      'Reserva creada manualmente por admin',
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id', new_reservation.id,
    'profile_id', new_reservation.profile_id,
    'class_schedule_id', new_reservation.class_schedule_id,
    'membership_id', new_reservation.membership_id,
    'reservation_date', new_reservation.reservation_date,
    'status', new_reservation.status,
    'token_charged', new_reservation.token_charged,
    'notes', new_reservation.notes,
    'profile', jsonb_build_object(
      'full_name', student_record.full_name,
      'email', student_record.email,
      'phone', student_record.phone
    ),
    'class_schedule', jsonb_build_object(
      'day_of_week', schedule_record.day_of_week,
      'time', schedule_record.time,
      'class_name', schedule_record.class_name,
      'coach', schedule_record.coach,
      'max_spots', schedule_record.max_spots
    )
  );
exception
  when unique_violation then
    raise exception 'El alumno ya tiene una reserva para esta clase.';
end;
$$;

grant execute on function public.admin_reserve_for_student(uuid, uuid, date, boolean, text) to authenticated;
grant execute on function public.is_coach_or_admin() to authenticated;

create or replace function public.coach_get_manual_reservation_profiles()
returns jsonb
language plpgsql
security definer
set search_path = public
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
set search_path = public
stable
as $$
begin
  if not public.is_coach_or_admin() then
    raise exception 'Solo admin o coach activo puede revisar membresias.';
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
        'plan', jsonb_build_object(
          'name', pl.name,
          'is_unlimited', pl.is_unlimited
        )
      )
      order by m.end_date desc nulls last
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

grant execute on function public.coach_get_manual_reservation_profiles() to authenticated;
grant execute on function public.coach_get_manual_reservation_memberships() to authenticated;

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
        'notes', r.notes,
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

grant execute on function public.coach_get_day_reservations(date) to authenticated;

drop function if exists public.get_my_reservations();

create or replace function public.get_my_reservations()
returns table (
  id uuid,
  profile_id uuid,
  class_schedule_id uuid,
  membership_id uuid,
  reservation_date date,
  status text,
  token_charged boolean,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz,
  schedule_day_of_week integer,
  schedule_time text,
  schedule_class_name text,
  schedule_coach text,
  schedule_max_spots integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.profile_id,
    r.class_schedule_id,
    r.membership_id,
    r.reservation_date,
    r.status,
    r.token_charged,
    r.cancelled_at,
    r.notes,
    r.created_at,
    cs.day_of_week as schedule_day_of_week,
    cs.time::text as schedule_time,
    cs.class_name as schedule_class_name,
    cs.coach as schedule_coach,
    cs.max_spots as schedule_max_spots
  from public.reservations r
  join public.class_schedule cs on cs.id = r.class_schedule_id
  where r.profile_id = auth.uid()
    and r.status in ('reserved', 'attended')
    and r.reservation_date >= current_date
  order by r.reservation_date, cs.time;
$$;

create or replace function public.admin_get_reservations()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar reservas.';
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
        'notes', r.notes,
        'created_at', r.created_at,
        'profile', jsonb_build_object(
          'full_name', p.full_name,
          'email', p.email,
          'phone', p.phone
        ),
        'class_schedule', jsonb_build_object(
          'day_of_week', cs.day_of_week,
          'time', cs.time,
          'class_name', cs.class_name,
          'coach', cs.coach,
          'max_spots', cs.max_spots
        )
      )
      order by r.reservation_date asc, cs.time asc nulls last
    )
    from public.reservations r
    left join public.profiles p on p.id = r.profile_id
    left join public.class_schedule cs on cs.id = r.class_schedule_id
    where r.reservation_date >= current_date
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_my_reservations() to authenticated;
grant execute on function public.admin_get_reservations() to authenticated;
