-- Functions exported from KUPAN production before the repair. No user data.
CREATE OR REPLACE FUNCTION public.admin_reserve_for_student(target_profile_id uuid, target_class_schedule_id uuid, target_reservation_date date, allow_without_membership boolean DEFAULT false, admin_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if student_record.id is null or student_record.status <> 'active' then
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

  if extract(isodow from target_reservation_date)::integer <> schedule_record.day_of_week then
    raise exception 'La fecha no corresponde al horario.';
  end if;
  if target_reservation_date < (now() at time zone 'America/Santiago')::date
    or target_reservation_date > (now() at time zone 'America/Santiago')::date + public.kupan_setting_int('reservation_window_days',7)
    or now() > public.kupan_class_starts_at(target_class_schedule_id,target_reservation_date) - make_interval(mins=>public.kupan_setting_int('reservation_closes_minutes',15)) then
    raise exception 'La reserva está fuera del período permitido.';
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

  -- The class is locked first; all reservation paths use class -> membership order.
  -- A new statement after this wait re-reads the committed token balance and Full limit.
  perform 1 from public.memberships m
  where m.profile_id=target_profile_id and m.status='active'
  order by m.id for update;

  -- Staff authorization was checked above; use the protected server query so
  -- coaches do not depend on a student-only get_active_membership RPC.
  select m.*, p.is_unlimited into active_membership
  from public.memberships m join public.plans p on p.id=m.plan_id
  where m.profile_id=target_profile_id and m.status='active' and m.payment_status='paid'
    and m.start_date <= (now() at time zone 'America/Santiago')::date
    and m.end_date >= (now() at time zone 'America/Santiago')::date
  order by m.end_date desc,m.created_at desc limit 1;

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

  if active_membership.start_date > target_reservation_date or active_membership.end_date < target_reservation_date then
    raise exception 'El plan no está vigente para esa fecha.';
  end if;
  if active_membership.is_unlimited is true and (select count(*) from public.reservations r
    where r.profile_id=target_profile_id and r.reservation_date=target_reservation_date
    and (r.status in ('reserved','attended','no_show') or (r.status='cancelled' and r.cancellation_kind='late'))
  ) >= public.kupan_setting_int('full_daily_limit',1) then
    raise exception 'El alumno alcanzó el límite diario del plan Full.';
  end if;

  if active_membership.activated_at is not null
    and active_membership.activated_at::date + interval '30 days' < current_date then
    raise exception 'El plan del alumno esta vencido.';
  end if;

  if active_membership.is_unlimited is not true then
    remaining_tokens := greatest(coalesce(active_membership.classes_total,0)-coalesce(active_membership.classes_used,0),0);

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
$function$;

CREATE OR REPLACE FUNCTION public.guard_reservation_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  spots_left integer;
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      if auth.uid() is null or new.profile_id <> auth.uid() then
        raise exception 'Solo puedes reservar para tu propio perfil.';
      end if;

      if not public.has_active_membership(new.profile_id) then
        raise exception 'Necesitas un plan activo para reservar.';
      end if;

      if new.status <> 'reserved' then
        raise exception 'La reserva inicial debe quedar como reserved.';
      end if;
    end if;

    select public.available_spots(new.class_schedule_id, new.reservation_date)
    into spots_left;

    if new.status = 'reserved' and coalesce(spots_left, 0) <= 0 then
      raise exception 'Clase completa.';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if not public.is_admin() then
      if auth.uid() is null or old.profile_id <> auth.uid() then
        raise exception 'Solo puedes modificar tus propias reservas.';
      end if;

      if old.status <> 'reserved' or new.status <> 'cancelled' then
        raise exception 'Solo puedes cancelar una reserva activa.';
      end if;

      new.profile_id := old.profile_id;
      new.class_schedule_id := old.class_schedule_id;
      new.reservation_date := old.reservation_date;
      new.created_at := old.created_at;
    end if;

    return new;
  end if;

  return new;
end;
$function$;
