-- KUPAN 2.1: reglas operativas, cancelaciones auditables y bases de crecimiento.
-- Migracion versionada. Revisar y aplicar primero en staging; no contiene datos reales.

insert into public.app_settings (key, value)
values
  ('membership_duration_days', '30'),
  ('reservation_window_days', '7'),
  ('reservation_closes_minutes', '15'),
  ('cancellation_refund_minutes', '45'),
  ('arrival_tolerance_minutes', '10'),
  ('default_class_capacity', '12'),
  ('full_daily_limit', '1'),
  ('medical_suspension_enabled', 'true')
on conflict (key) do nothing;

alter table public.reservations
  add column if not exists cancellation_kind text,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_by uuid references public.profiles(id),
  add column if not exists token_refunded boolean not null default false,
  add column if not exists cancellation_cutoff_at timestamptz,
  add column if not exists attendance_marked_at timestamptz,
  add column if not exists attendance_marked_by uuid references public.profiles(id),
  add column if not exists arrival_status text;

alter table public.memberships
  add column if not exists agreed_price integer,
  add column if not exists agreement_valid_until date,
  add column if not exists agreement_note text;

-- Un ciclo de 30 dias calendario incluye el dia de activacion: dia 1 = start_date.
-- Las funciones admin historicas enviaban start_date + 30; este trigger normaliza
-- ese valor a start_date + 29 sin alterar extensiones o suspensiones existentes.
alter table public.memberships
  drop constraint if exists memberships_exact_30_day_cycle_chk,
  drop constraint if exists memberships_minimum_30_day_cycle_chk;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'memberships_valid_cycle_chk'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_valid_cycle_chk
      check (end_date >= start_date and coalesce(expires_at, end_date) = end_date);
  end if;
end $$;

create or replace function public.normalize_membership_30_day_cycle()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.end_date = new.start_date + 30
    and coalesce(new.expires_at, new.end_date) = new.end_date then
    new.end_date := new.start_date + 29;
    new.expires_at := new.end_date;
  elsif new.expires_at is null then
    new.expires_at := new.end_date;
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_normalize_30_day_cycle on public.memberships;
create trigger memberships_normalize_30_day_cycle
before insert or update of start_date, end_date, expires_at on public.memberships
for each row execute function public.normalize_membership_30_day_cycle();

-- El perfil se refresca automaticamente cuando cambian plan, tokens o reservas.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'memberships'
    ) then alter publication supabase_realtime add table public.memberships; end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'membership_token_movements'
    ) then alter publication supabase_realtime add table public.membership_token_movements; end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations'
    ) then alter publication supabase_realtime add table public.reservations; end if;
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  plan_id uuid not null references public.plans(id),
  provider text not null,
  provider_reference text not null,
  amount integer,
  status text not null check (status in ('pending', 'approved', 'rejected', 'refunded')),
  membership_id uuid references public.memberships(id),
  simulated boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

alter table public.payments enable row level security;
drop policy if exists "Students read own payments" on public.payments;
create policy "Students read own payments" on public.payments
for select to authenticated using (profile_id = auth.uid() or public.is_admin());
drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments" on public.payments
for all to authenticated using (public.is_admin()) with check (public.is_admin());

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reservations_cancellation_kind_chk'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_cancellation_kind_chk
      check (cancellation_kind is null or cancellation_kind in ('timely', 'late', 'kupan'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reservations_arrival_status_chk'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_arrival_status_chk
      check (arrival_status is null or arrival_status in ('on_time', 'late', 'rejected_for_safety'));
  end if;
end $$;

create or replace function public.kupan_setting_int(setting_key text, fallback_value integer)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select case when value ~ '^[0-9]+$' then value::integer end
     from public.app_settings where key = setting_key),
    fallback_value
  );
$$;

create or replace function public.kupan_class_starts_at(
  target_class_schedule_id uuid,
  target_reservation_date date
)
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (target_reservation_date::timestamp + cs.time) at time zone 'America/Santiago'
  from public.class_schedule cs
  where cs.id = target_class_schedule_id;
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
  active_membership record;
  class_record public.class_schedule;
  class_starts_at timestamptz;
  spots_left integer;
  new_reservation public.reservations;
  remaining_tokens integer;
  window_days integer := public.kupan_setting_int('reservation_window_days', 7);
  closes_minutes integer := public.kupan_setting_int('reservation_closes_minutes', 15);
  full_daily_limit integer := public.kupan_setting_int('full_daily_limit', 1);
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para reservar.';
  end if;

  if auth.uid() <> target_profile_id and not public.is_admin() then
    raise exception 'Solo puedes reservar con tu propio perfil.';
  end if;

  if target_reservation_date < (now() at time zone 'America/Santiago')::date then
    raise exception 'No puedes reservar una clase pasada.';
  end if;

  if target_reservation_date > (now() at time zone 'America/Santiago')::date + window_days then
    raise exception 'Las clases se habilitan con % días de anticipación.', window_days;
  end if;

  select * into class_record
  from public.class_schedule
  where id = target_class_schedule_id and active = true
  for update;

  if class_record.id is null then
    raise exception 'Clase no disponible.';
  end if;

  if extract(isodow from target_reservation_date)::integer <> class_record.day_of_week then
    raise exception 'La fecha no corresponde al día del horario seleccionado.';
  end if;

  class_starts_at := public.kupan_class_starts_at(target_class_schedule_id, target_reservation_date);
  if class_starts_at is null or now() > class_starts_at - make_interval(mins => closes_minutes) then
    raise exception 'Las reservas cierran % minutos antes de la clase.', closes_minutes;
  end if;

  select * into active_membership
  from public.get_active_membership(target_profile_id)
  limit 1;

  if active_membership.id is null then
    raise exception 'Necesitas una membresía activa y pagada para reservar.';
  end if;

  if active_membership.end_date < target_reservation_date
    or active_membership.start_date > target_reservation_date then
    raise exception 'Tu membresía no está vigente para la fecha de esta clase.';
  end if;

  if exists (
    select 1 from public.reservations r
    where r.profile_id = target_profile_id
      and r.class_schedule_id = target_class_schedule_id
      and r.reservation_date = target_reservation_date
      and r.status in ('reserved', 'attended', 'no_show')
  ) then
    raise exception 'Ya tienes una reserva para esta clase.';
  end if;

  if active_membership.is_unlimited is true and (
    select count(*)
    from public.reservations r
    where r.profile_id = target_profile_id
      and r.reservation_date = target_reservation_date
      and (
        r.status in ('reserved', 'attended', 'no_show')
        or (r.status = 'cancelled' and r.cancellation_kind = 'late')
      )
  ) >= full_daily_limit then
    raise exception 'Tu plan Full permite una reserva por día de lunes a viernes.';
  end if;

  select public.available_spots(target_class_schedule_id, target_reservation_date)
  into spots_left;
  if coalesce(spots_left, 0) <= 0 then
    raise exception 'Clase completa. Puedes entrar a la lista de espera.';
  end if;

  remaining_tokens := public.membership_remaining_tokens(active_membership.id);
  if active_membership.is_unlimited is not true then
    if coalesce(remaining_tokens, 0) <= 0 then
      raise exception 'No tienes tokens disponibles. Debes renovar tu plan.';
    end if;

    update public.memberships
    set classes_used = classes_used + 1,
        updated_at = now()
    where id = active_membership.id;
  end if;

  insert into public.reservations (
    profile_id, class_schedule_id, reservation_date, status,
    membership_id, token_charged, token_refunded, cancellation_cutoff_at
  ) values (
    target_profile_id, target_class_schedule_id, target_reservation_date, 'reserved',
    active_membership.id, active_membership.is_unlimited is not true, false,
    class_starts_at - make_interval(mins => public.kupan_setting_int('cancellation_refund_minutes', 45))
  )
  returning * into new_reservation;

  if active_membership.is_unlimited is not true then
    insert into public.membership_token_movements (
      membership_id, profile_id, reservation_id, movement_type,
      quantity, reason, created_by
    ) values (
      active_membership.id, target_profile_id, new_reservation.id, 'charge',
      1, 'Reserva de clase', auth.uid()
    );
  end if;

  return new_reservation;
exception
  when unique_violation then
    raise exception 'Ya tienes una reserva para esta clase.';
end;
$$;

create table if not exists public.class_waitlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  class_schedule_id uuid not null references public.class_schedule(id) on delete cascade,
  reservation_date date not null,
  status text not null default 'waiting' check (status in ('waiting', 'promoted', 'left', 'expired')),
  position_hint integer,
  joined_at timestamptz not null default now(),
  promoted_at timestamptz,
  left_at timestamptz,
  reservation_id uuid references public.reservations(id) on delete set null
);

create or replace function public.promote_class_waitlist(
  target_class_schedule_id uuid,
  target_reservation_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wait_entry public.class_waitlist;
  active_membership record;
  new_reservation public.reservations;
  remaining_tokens integer;
  class_starts_at timestamptz;
begin
  if public.available_spots(target_class_schedule_id, target_reservation_date) <= 0 then
    return null;
  end if;

  for wait_entry in
    select * from public.class_waitlist
    where class_schedule_id = target_class_schedule_id
      and reservation_date = target_reservation_date
      and status = 'waiting'
    order by joined_at
    for update skip locked
  loop
    select m.*, p.is_unlimited into active_membership
    from public.memberships m
    join public.plans p on p.id = m.plan_id
    where m.profile_id = wait_entry.profile_id
      and m.status = 'active'
      and m.payment_status = 'paid'
      and m.start_date <= target_reservation_date
      and m.end_date >= target_reservation_date
    order by m.end_date desc, m.created_at desc
    limit 1
    for update of m;

    if active_membership.id is null then
      update public.class_waitlist set status = 'expired' where id = wait_entry.id;
      continue;
    end if;

    remaining_tokens := case
      when active_membership.is_unlimited then null
      else greatest(coalesce(active_membership.classes_total, 0) - coalesce(active_membership.classes_used, 0), 0)
    end;

    if active_membership.is_unlimited is not true and remaining_tokens <= 0 then
      update public.class_waitlist set status = 'expired' where id = wait_entry.id;
      continue;
    end if;

    if active_membership.is_unlimited is true and exists (
      select 1 from public.reservations r
      where r.profile_id = wait_entry.profile_id
        and r.reservation_date = target_reservation_date
        and (r.status in ('reserved', 'attended', 'no_show') or (r.status = 'cancelled' and r.cancellation_kind = 'late'))
    ) then
      update public.class_waitlist set status = 'expired' where id = wait_entry.id;
      continue;
    end if;

    class_starts_at := public.kupan_class_starts_at(target_class_schedule_id, target_reservation_date);
    insert into public.reservations (
      profile_id, class_schedule_id, reservation_date, status,
      membership_id, token_charged, token_refunded, cancellation_cutoff_at
    ) values (
      wait_entry.profile_id, target_class_schedule_id, target_reservation_date, 'reserved',
      active_membership.id, active_membership.is_unlimited is not true, false,
      class_starts_at - make_interval(mins => public.kupan_setting_int('cancellation_refund_minutes', 45))
    ) returning * into new_reservation;

    if active_membership.is_unlimited is not true then
      update public.memberships set classes_used = classes_used + 1, updated_at = now()
      where id = active_membership.id;
      insert into public.membership_token_movements (
        membership_id, profile_id, reservation_id, movement_type, quantity, reason, created_by
      ) values (
        active_membership.id, wait_entry.profile_id, new_reservation.id,
        'charge', 1, 'Promoción automática desde lista de espera', null
      );
    end if;

    update public.class_waitlist
    set status = 'promoted', promoted_at = now(), reservation_id = new_reservation.id
    where id = wait_entry.id;

    if to_regclass('public.notifications') is not null then
      execute 'insert into public.notifications (profile_id, title, message, type, read) values ($1, $2, $3, $4, false)'
      using wait_entry.profile_id, 'Cupo confirmado', 'Se liberó un cupo y tu reserva quedó confirmada.', 'reservation_confirmed';
    end if;

    return new_reservation.id;
  end loop;

  return null;
end;
$$;

create or replace function public.cancel_reservation(
  target_reservation_id uuid,
  reason_input text default null
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservation_record public.reservations;
  updated_reservation public.reservations;
  class_starts_at timestamptz;
  cutoff_at timestamptz;
  resolved_kind text;
  should_refund boolean := false;
  actor_is_staff boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para cancelar.';
  end if;

  select * into reservation_record
  from public.reservations
  where id = target_reservation_id
  for update;

  if reservation_record.id is null then
    raise exception 'Reserva no encontrada.';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'coach')
  ) into actor_is_staff;

  if auth.uid() <> reservation_record.profile_id and not actor_is_staff then
    raise exception 'Solo puedes cancelar tus propias reservas.';
  end if;

  if reservation_record.status = 'cancelled' then
    return reservation_record;
  end if;

  if reservation_record.status in ('attended', 'no_show') then
    raise exception 'La asistencia ya fue cerrada. El token queda consumido.';
  end if;

  class_starts_at := public.kupan_class_starts_at(
    reservation_record.class_schedule_id,
    reservation_record.reservation_date
  );
  cutoff_at := class_starts_at - make_interval(mins => public.kupan_setting_int('cancellation_refund_minutes', 45));

  if actor_is_staff and auth.uid() <> reservation_record.profile_id then
    resolved_kind := 'kupan';
    should_refund := reservation_record.token_charged;
  elsif now() <= cutoff_at then
    resolved_kind := 'timely';
    should_refund := reservation_record.token_charged;
  else
    resolved_kind := 'late';
    should_refund := false;
  end if;

  if should_refund
    and reservation_record.membership_id is not null
    and reservation_record.token_refunded is not true then
    update public.memberships
    set classes_used = greatest(classes_used - 1, 0),
        updated_at = now()
    where id = reservation_record.membership_id;

    insert into public.membership_token_movements (
      membership_id, profile_id, reservation_id, movement_type,
      quantity, reason, created_by
    ) values (
      reservation_record.membership_id,
      reservation_record.profile_id,
      reservation_record.id,
      'refund',
      1,
      case when resolved_kind = 'kupan'
        then 'Clase cancelada por KUPAN'
        else 'Cancelación con 45 minutos o más de anticipación'
      end,
      auth.uid()
    );
  end if;

  update public.reservations
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_kind = resolved_kind,
      cancellation_reason = nullif(trim(reason_input), ''),
      cancellation_cutoff_at = cutoff_at,
      token_refunded = should_refund and reservation_record.token_charged
  where id = target_reservation_id
  returning * into updated_reservation;

  perform public.promote_class_waitlist(
    reservation_record.class_schedule_id,
    reservation_record.reservation_date
  );

  return updated_reservation;
end;
$$;

-- Firma compatible para clientes antiguos; delega a la función auditada.
create or replace function public.cancel_reservation(target_reservation_id uuid)
returns public.reservations
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.cancel_reservation(target_reservation_id, null);
$$;

create or replace function public.admin_cancel_reservation(
  target_reservation_id uuid,
  cancellation_reason text default 'Clase cancelada por KUPAN'
)
returns public.reservations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'coach')
  ) then
    raise exception 'Solo administración o coach puede cancelar por KUPAN.';
  end if;
  return public.cancel_reservation(target_reservation_id, cancellation_reason);
end;
$$;

create unique index if not exists class_waitlist_one_waiting_idx
  on public.class_waitlist(profile_id, class_schedule_id, reservation_date)
  where status = 'waiting';
create index if not exists class_waitlist_queue_idx
  on public.class_waitlist(class_schedule_id, reservation_date, joined_at)
  where status = 'waiting';

alter table public.class_waitlist enable row level security;
drop policy if exists "Students read own waitlist" on public.class_waitlist;
create policy "Students read own waitlist" on public.class_waitlist
for select to authenticated using (profile_id = auth.uid() or public.is_admin());

create or replace function public.join_class_waitlist(
  target_class_schedule_id uuid,
  target_reservation_date date
)
returns public.class_waitlist
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_entry public.class_waitlist;
  active_membership record;
  class_starts_at timestamptz;
  queue_position integer;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into active_membership from public.get_active_membership(auth.uid()) limit 1;
  if active_membership.id is null then raise exception 'Necesitas una membresía activa y pagada.'; end if;
  if active_membership.is_unlimited is not true
    and coalesce(public.membership_remaining_tokens(active_membership.id), 0) <= 0 then
    raise exception 'No tienes tokens disponibles para entrar a la lista de espera.';
  end if;

  class_starts_at := public.kupan_class_starts_at(target_class_schedule_id, target_reservation_date);
  if class_starts_at is null then raise exception 'Clase no disponible.'; end if;
  if now() > class_starts_at - make_interval(mins => public.kupan_setting_int('reservation_closes_minutes', 15)) then
    raise exception 'La lista de espera ya cerró para esta clase.';
  end if;
  if public.available_spots(target_class_schedule_id, target_reservation_date) > 0 then
    raise exception 'La clase todavía tiene cupos. Reserva directamente.';
  end if;
  if exists (
    select 1 from public.reservations r where r.profile_id = auth.uid()
      and r.class_schedule_id = target_class_schedule_id
      and r.reservation_date = target_reservation_date
      and r.status in ('reserved', 'attended', 'no_show')
  ) then raise exception 'Ya tienes una reserva para esta clase.'; end if;

  select count(*) + 1 into queue_position
  from public.class_waitlist
  where class_schedule_id = target_class_schedule_id
    and reservation_date = target_reservation_date
    and status = 'waiting';

  insert into public.class_waitlist (
    profile_id, class_schedule_id, reservation_date, position_hint
  ) values (auth.uid(), target_class_schedule_id, target_reservation_date, queue_position)
  returning * into new_entry;
  return new_entry;
exception when unique_violation then
  raise exception 'Ya estás en la lista de espera de esta clase.';
end;
$$;

create or replace function public.leave_class_waitlist(target_waitlist_id uuid)
returns public.class_waitlist
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare updated_entry public.class_waitlist;
begin
  update public.class_waitlist
  set status = 'left', left_at = now()
  where id = target_waitlist_id and profile_id = auth.uid() and status = 'waiting'
  returning * into updated_entry;
  if updated_entry.id is null then raise exception 'Entrada de lista de espera no encontrada.'; end if;
  return updated_entry;
end;
$$;

create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text not null,
  primary_goal text not null,
  previous_experience text,
  desired_class_schedule_id uuid references public.class_schedule(id),
  desired_date date,
  physical_limitations text,
  privacy_accepted_at timestamptz not null,
  status text not null default 'interested' check (status in ('interested', 'contacted', 'trial_reserved', 'attended', 'no_show', 'converted', 'not_converted')),
  next_action_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_profile_id uuid references public.profiles(id)
);

alter table public.trial_requests enable row level security;
drop policy if exists "Admins manage trial requests" on public.trial_requests;
create policy "Admins manage trial requests" on public.trial_requests
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.request_trial_class(
  full_name text,
  phone text,
  primary_goal text,
  email text default null,
  previous_experience text default null,
  desired_class_schedule_id uuid default null,
  desired_date date default null,
  physical_limitations text default null,
  privacy_accepted boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare new_id uuid;
begin
  if nullif(trim(full_name), '') is null or nullif(trim(phone), '') is null or nullif(trim(primary_goal), '') is null then
    raise exception 'Nombre, contacto y objetivo son obligatorios.';
  end if;
  if privacy_accepted is not true then raise exception 'Debes aceptar las políticas y privacidad.'; end if;
  if exists (
    select 1 from public.trial_requests tr
    where (lower(tr.email) = lower(nullif(trim(request_trial_class.email), '')) or tr.phone = trim(request_trial_class.phone))
      and tr.status in ('trial_reserved', 'attended', 'converted')
  ) then raise exception 'La primera clase gratuita ya fue utilizada o reservada para este contacto.'; end if;

  insert into public.trial_requests (
    full_name, email, phone, primary_goal, previous_experience,
    desired_class_schedule_id, desired_date, physical_limitations, privacy_accepted_at
  ) values (
    trim(full_name), nullif(lower(trim(email)), ''), trim(phone), trim(primary_goal),
    nullif(trim(previous_experience), ''), desired_class_schedule_id, desired_date,
    nullif(trim(physical_limitations), ''), now()
  ) returning id into new_id;
  return new_id;
end;
$$;

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
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'coach')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'coach')));

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
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'coach'))
);

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
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'coach')
  ) then raise exception 'Solo coach o administración puede registrar asistencia.'; end if;

  if target_status not in ('reserved', 'attended', 'no_show') then
    raise exception 'Estado de asistencia inválido.';
  end if;
  if target_arrival_status is not null and target_arrival_status not in ('on_time', 'late', 'rejected_for_safety') then
    raise exception 'Estado de llegada inválido.';
  end if;

  select * into current_record from public.reservations
  where id = target_reservation_id for update;
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

create table if not exists public.membership_suspensions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  reason text not null,
  starts_on date not null,
  ends_on date not null,
  document_reference text,
  days_extended integer not null check (days_extended >= 0),
  approved_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table public.membership_suspensions enable row level security;
drop policy if exists "Students read own suspensions" on public.membership_suspensions;
create policy "Students read own suspensions" on public.membership_suspensions
for select to authenticated using (
  exists (select 1 from public.memberships m where m.id = membership_id and m.profile_id = auth.uid())
  or public.is_admin()
);
drop policy if exists "Admins manage suspensions" on public.membership_suspensions;
create policy "Admins manage suspensions" on public.membership_suspensions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.communication_drafts (
  id uuid primary key default gen_random_uuid(),
  audience_type text not null check (audience_type in ('class', 'expiring', 'waitlist', 'new_students', 'community')),
  class_schedule_id uuid references public.class_schedule(id),
  reservation_date date,
  title text not null,
  message text not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'sent', 'failed', 'cancelled')),
  recipient_count integer not null default 0,
  created_by uuid not null references public.profiles(id),
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  sent_at timestamptz,
  result_summary text
);

alter table public.communication_drafts enable row level security;
drop policy if exists "Admins manage communication drafts" on public.communication_drafts;
create policy "Admins manage communication drafts" on public.communication_drafts
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_get_operational_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  month_start date := date_trunc('month', now() at time zone 'America/Santiago')::date;
  next_month date := (date_trunc('month', now() at time zone 'America/Santiago') + interval '1 month')::date;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'
  ) then raise exception 'Acceso administrativo requerido.'; end if;

  return jsonb_build_object(
    'pending_payments', (select count(*) from public.payments where status = 'pending'),
    'confirmed_income', coalesce((select sum(amount) from public.payments where status = 'approved' and confirmed_at >= month_start and confirmed_at < next_month), 0),
    'average_ticket', coalesce((select round(avg(amount)) from public.payments where status = 'approved' and confirmed_at >= month_start and confirmed_at < next_month), 0),
    'no_show_rate', coalesce((
      select round(100.0 * count(*) filter (where status = 'no_show') / nullif(count(*) filter (where status in ('attended', 'no_show')), 0), 1)
      from public.reservations where reservation_date >= month_start and reservation_date < next_month
    ), 0),
    'waitlist_count', (select count(*) from public.class_waitlist where status = 'waiting'),
    'pending_trials', (select count(*) from public.trial_requests where status in ('interested', 'contacted', 'trial_booked'))
  );
end;
$$;

revoke all on function public.kupan_setting_int(text, integer) from public;
revoke all on function public.kupan_class_starts_at(uuid, date) from public;
revoke all on function public.reserve_class(uuid, uuid, date) from public;
revoke all on function public.promote_class_waitlist(uuid, date) from public;
revoke all on function public.cancel_reservation(uuid, text) from public;
revoke all on function public.cancel_reservation(uuid) from public;
revoke all on function public.admin_cancel_reservation(uuid, text) from public;
revoke all on function public.join_class_waitlist(uuid, date) from public;
revoke all on function public.leave_class_waitlist(uuid) from public;
revoke all on function public.request_trial_class(text, text, text, text, text, uuid, date, text, boolean) from public;
revoke all on function public.coach_mark_attendance(uuid, text, text, text) from public;
revoke all on function public.admin_get_operational_metrics() from public;

grant execute on function public.kupan_setting_int(text, integer) to authenticated, service_role;
grant execute on function public.kupan_class_starts_at(uuid, date) to authenticated, service_role;
grant execute on function public.reserve_class(uuid, uuid, date) to authenticated;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.admin_cancel_reservation(uuid, text) to authenticated;
grant execute on function public.join_class_waitlist(uuid, date) to authenticated;
grant execute on function public.leave_class_waitlist(uuid) to authenticated;
grant execute on function public.request_trial_class(text, text, text, text, text, uuid, date, text, boolean) to anon, authenticated;
grant execute on function public.coach_mark_attendance(uuid, text, text, text) to authenticated;
grant execute on function public.admin_get_operational_metrics() to authenticated;

comment on function public.cancel_reservation(uuid, text) is
  'Cancela una reserva con corte exacto de 45 minutos, auditoría e idempotencia de devolución.';
comment on table public.coach_private_notes is
  'Observaciones privadas; nunca exponer en Comunidad, rankings ni perfiles públicos.';
