-- Sistema real de tokens, vigencia de planes, reservas y pagos KUPAN.
-- Ejecutar en Supabase SQL Editor despues del esquema base.

alter table public.memberships
  add column if not exists classes_total integer,
  add column if not exists classes_used integer not null default 0,
  add column if not exists expires_at date,
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  add column if not exists payment_provider text,
  add column if not exists payment_reference text,
  add column if not exists activated_at timestamptz,
  add column if not exists auto_activated boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_classes_used_non_negative_chk'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_classes_used_non_negative_chk
      check (classes_used >= 0)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_classes_total_non_negative_chk'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_classes_total_non_negative_chk
      check (classes_total is null or classes_total >= 0)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_classes_used_not_over_total_chk'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_classes_used_not_over_total_chk
      check (classes_total is null or classes_used <= classes_total)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'memberships_exact_30_day_cycle_chk'
      and conrelid = 'public.memberships'::regclass
  ) then
    alter table public.memberships
      add constraint memberships_exact_30_day_cycle_chk
      check (end_date = start_date + 30)
      not valid;
  end if;
end $$;

alter table public.reservations
  add column if not exists membership_id uuid references public.memberships(id),
  add column if not exists token_charged boolean not null default false,
  add column if not exists cancelled_at timestamptz;

create table if not exists public.membership_token_movements (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  movement_type text not null check (movement_type in ('charge', 'refund', 'expire', 'manual_adjustment')),
  quantity integer not null,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create unique index if not exists memberships_payment_reference_unique_idx
  on public.memberships(payment_provider, payment_reference)
  where payment_reference is not null;

create index if not exists memberships_active_lookup_idx
  on public.memberships(profile_id, status, start_date, end_date, payment_status);

create index if not exists token_movements_membership_idx
  on public.membership_token_movements(membership_id, created_at desc);

create unique index if not exists reservations_one_active_per_class_date_idx
  on public.reservations(profile_id, class_schedule_id, reservation_date)
  where status = 'reserved';

update public.memberships m
set
  expires_at = coalesce(m.expires_at, m.end_date),
  payment_status = case
    when m.status = 'active' and m.payment_status = 'pending' then 'paid'
    else m.payment_status
  end,
  activated_at = coalesce(m.activated_at, m.created_at),
  classes_total = coalesce(
    m.classes_total,
    case
      when p.is_unlimited then null
      when p.name ilike '%4%' then 4
      when p.name ilike '%8%' then 8
      when p.name ilike '%12%' then 12
      when p.name ilike '%16%' then 16
      else p.classes_per_week * 4
    end
  )
from public.plans p
where m.plan_id = p.id;

create or replace function public.get_active_membership(target_profile_id uuid)
returns table (
  id uuid,
  profile_id uuid,
  plan_id uuid,
  start_date date,
  end_date date,
  status text,
  notes text,
  classes_total integer,
  classes_used integer,
  expires_at date,
  payment_status text,
  payment_provider text,
  payment_reference text,
  activated_at timestamptz,
  auto_activated boolean,
  plan_name text,
  is_unlimited boolean
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.profile_id,
    m.plan_id,
    m.start_date,
    m.end_date,
    m.status,
    m.notes,
    m.classes_total,
    m.classes_used,
    m.expires_at,
    m.payment_status,
    m.payment_provider,
    m.payment_reference,
    m.activated_at,
    m.auto_activated,
    p.name as plan_name,
    p.is_unlimited
  from public.memberships m
  join public.plans p on p.id = m.plan_id
  where m.profile_id = target_profile_id
    and m.status = 'active'
    and m.start_date <= current_date
    and m.end_date >= current_date
    and coalesce(m.expires_at, m.end_date) >= current_date
    and m.payment_status = 'paid'
    and (auth.uid() = target_profile_id or public.is_admin())
  order by m.end_date desc, m.created_at desc
  limit 1;
$$;

create or replace function public.membership_remaining_tokens(target_membership_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select
    case
      when p.is_unlimited then null
      else greatest(coalesce(m.classes_total, 0) - coalesce(m.classes_used, 0), 0)
    end
  from public.memberships m
  join public.plans p on p.id = m.plan_id
  where m.id = target_membership_id
    and (m.profile_id = auth.uid() or public.is_admin());
$$;

create or replace function public.reserve_class(
  target_profile_id uuid,
  target_class_schedule_id uuid,
  target_reservation_date date
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  active_membership record;
  spots_left integer;
  new_reservation public.reservations;
  remaining_tokens integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para reservar.';
  end if;

  if auth.uid() <> target_profile_id and not public.is_admin() then
    raise exception 'Solo puedes reservar con tu propio perfil.';
  end if;

  select * into active_membership
  from public.get_active_membership(target_profile_id)
  limit 1;

  if active_membership.id is null then
    raise exception 'Necesitas una membresia activa y pagada para reservar.';
  end if;

  if active_membership.activated_at is not null
    and active_membership.activated_at::date + interval '30 days' < current_date then
    raise exception 'Tu plan vencio. Los tokens no utilizados no son acumulables.';
  end if;

  perform 1
  from public.class_schedule
  where id = target_class_schedule_id
    and active = true
  for update;

  if not found then
    raise exception 'Clase no disponible.';
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
    raise exception 'Ya tienes una reserva para esta clase.';
  end if;

  remaining_tokens := public.membership_remaining_tokens(active_membership.id);

  if active_membership.is_unlimited is not true then
    if coalesce(remaining_tokens, 0) <= 0 then
      raise exception 'No tienes tokens disponibles. Debes renovar tu plan.';
    end if;

    update public.memberships
    set classes_used = classes_used + 1
    where id = active_membership.id;
  end if;

  insert into public.reservations (
    profile_id,
    class_schedule_id,
    reservation_date,
    status,
    membership_id,
    token_charged
  )
  values (
    target_profile_id,
    target_class_schedule_id,
    target_reservation_date,
    'reserved',
    active_membership.id,
    active_membership.is_unlimited is not true
  )
  returning * into new_reservation;

  if active_membership.is_unlimited is not true then
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
      'Reserva de clase',
      auth.uid()
    );
  end if;

  return new_reservation;
exception
  when unique_violation then
    raise exception 'Ya tienes una reserva para esta clase.';
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

  if auth.uid() <> reservation_record.profile_id and not public.is_admin() then
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
  if not public.is_admin() then
    raise exception 'Solo admin puede marcar asistencia.';
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

create or replace function public.expire_old_memberships()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record record;
  expired_count integer := 0;
  unused_tokens integer;
begin
  for membership_record in
    select m.*, p.is_unlimited
    from public.memberships m
    join public.plans p on p.id = m.plan_id
    where m.status = 'active'
      and m.end_date < current_date
  loop
    update public.memberships
    set status = 'expired',
        expires_at = coalesce(expires_at, end_date)
    where id = membership_record.id;

    if membership_record.is_unlimited is not true then
      unused_tokens := greatest(coalesce(membership_record.classes_total, 0) - coalesce(membership_record.classes_used, 0), 0);

      if unused_tokens > 0 then
        insert into public.membership_token_movements (
          membership_id,
          profile_id,
          movement_type,
          quantity,
          reason
        )
        values (
          membership_record.id,
          membership_record.profile_id,
          'expire',
          unused_tokens,
          'Tokens vencidos al terminar el plan'
        );
      end if;
    end if;

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

create or replace function public.admin_activate_membership(
  target_profile_id uuid,
  target_plan_id uuid,
  membership_start_date date,
  classes_total_override integer default null,
  initial_classes_used integer default 0,
  payment_provider_input text default 'manual_admin',
  payment_reference_input text default null,
  notes_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_record record;
  membership_record public.memberships%rowtype;
  total_classes integer;
  used_classes integer;
  final_payment_reference text;
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede activar membresias.';
  end if;

  if target_profile_id is null or target_plan_id is null or membership_start_date is null then
    raise exception 'Selecciona alumno, plan e inicio para activar la membresia.';
  end if;

  select *
  into plan_record
  from public.plans
  where id = target_plan_id;

  if not found then
    raise exception 'El plan seleccionado no existe.';
  end if;

  used_classes := greatest(coalesce(initial_classes_used, 0), 0);

  if plan_record.is_unlimited then
    total_classes := null;
    used_classes := 0;
  else
    total_classes := coalesce(
      classes_total_override,
      case
        when plan_record.name ilike '%4%' then 4
        when plan_record.name ilike '%8%' then 8
        when plan_record.name ilike '%12%' then 12
        when plan_record.name ilike '%16%' then 16
        else coalesce(plan_record.classes_per_week, 0) * 4
      end
    );

    if total_classes <= 0 then
      raise exception 'Indica un total de tokens valido para el plan.';
    end if;

    if used_classes > total_classes then
      raise exception 'Los tokens ya usados no pueden ser mayores que los tokens del plan.';
    end if;
  end if;

  final_payment_reference := coalesce(
    nullif(payment_reference_input, ''),
    'manual-' || target_profile_id::text || '-' || extract(epoch from now())::bigint::text
  );

  update public.memberships
  set
    status = 'expired',
    updated_at = now()
  where profile_id = target_profile_id
    and status = 'active';

  insert into public.memberships (
    profile_id,
    plan_id,
    start_date,
    end_date,
    expires_at,
    status,
    classes_total,
    classes_used,
    payment_status,
    payment_provider,
    payment_reference,
    activated_at,
    auto_activated,
    notes
  )
  values (
    target_profile_id,
    target_plan_id,
    membership_start_date,
    membership_start_date + 30,
    membership_start_date + 30,
    'active',
    total_classes,
    used_classes,
    'paid',
    coalesce(nullif(payment_provider_input, ''), 'manual_admin'),
    final_payment_reference,
    now(),
    false,
    notes_input
  )
  returning * into membership_record;

  if used_classes > 0 then
    insert into public.membership_token_movements (
      membership_id,
      profile_id,
      movement_type,
      quantity,
      reason,
      created_by
    )
    values (
      membership_record.id,
      membership_record.profile_id,
      'manual_adjustment',
      used_classes,
      'Migración inicial: clases usadas antes de activar app',
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id', membership_record.id,
    'profile_id', membership_record.profile_id,
    'classes_total', membership_record.classes_total,
    'classes_used', membership_record.classes_used,
    'available_tokens', case
      when total_classes is null then null
      else greatest(total_classes - used_classes, 0)
    end
  );
end;
$$;

drop function if exists public.admin_update_membership(uuid, uuid, date, text, text, text, text, text, integer, integer);

create or replace function public.admin_update_membership(
  target_membership_id uuid,
  target_plan_id uuid,
  start_date_input date,
  status_input text,
  payment_status_input text,
  payment_provider_input text default null,
  payment_reference_input text default null,
  notes_input text default null,
  classes_total_input integer default null,
  classes_used_input integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_membership public.memberships%rowtype;
  updated_membership public.memberships%rowtype;
  plan_record record;
  total_classes integer;
  used_classes integer;
  token_difference integer;
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede editar membresias.';
  end if;

  if target_membership_id is null or target_plan_id is null or start_date_input is null then
    raise exception 'Faltan datos obligatorios para guardar la membresia.';
  end if;

  if status_input not in ('active', 'expired', 'paused', 'cancelled') then
    raise exception 'Estado de membresia no valido.';
  end if;

  if payment_status_input not in ('pending', 'paid', 'failed', 'refunded') then
    raise exception 'Estado de pago no valido.';
  end if;

  select *
  into current_membership
  from public.memberships
  where id = target_membership_id
  for update;

  if not found then
    raise exception 'La membresia seleccionada no existe.';
  end if;

  select *
  into plan_record
  from public.plans
  where id = target_plan_id;

  if not found then
    raise exception 'El plan seleccionado no existe.';
  end if;

  used_classes := greatest(coalesce(classes_used_input, 0), 0);

  if plan_record.is_unlimited then
    total_classes := null;
    used_classes := 0;
  else
    total_classes := coalesce(
      classes_total_input,
      case
        when plan_record.name ilike '%4%' then 4
        when plan_record.name ilike '%8%' then 8
        when plan_record.name ilike '%12%' then 12
        when plan_record.name ilike '%16%' then 16
        else coalesce(plan_record.classes_per_week, 0) * 4
      end
    );

    if total_classes <= 0 then
      raise exception 'Indica un total de tokens valido para el plan.';
    end if;

    if used_classes > total_classes then
      raise exception 'Los tokens usados no pueden ser mayores que los tokens totales.';
    end if;
  end if;

  if status_input = 'active' then
    update public.memberships
    set
      status = 'expired',
      updated_at = now()
    where profile_id = current_membership.profile_id
      and status = 'active'
      and id <> target_membership_id;
  end if;

  token_difference := used_classes - coalesce(current_membership.classes_used, 0);

  update public.memberships
  set
    plan_id = target_plan_id,
    start_date = start_date_input,
    end_date = start_date_input + 30,
    expires_at = start_date_input + 30,
    status = status_input,
    payment_status = payment_status_input,
    payment_provider = nullif(payment_provider_input, ''),
    payment_reference = nullif(payment_reference_input, ''),
    notes = notes_input,
    classes_total = total_classes,
    classes_used = used_classes,
    activated_at = case
      when status_input = 'active' then coalesce(activated_at, now())
      else activated_at
    end,
    updated_at = now()
  where id = target_membership_id
  returning * into updated_membership;

  if token_difference <> 0 then
    insert into public.membership_token_movements (
      membership_id,
      profile_id,
      movement_type,
      quantity,
      reason,
      created_by
    )
    values (
      updated_membership.id,
      updated_membership.profile_id,
      'manual_adjustment',
      token_difference,
      'Ajuste manual admin',
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id', updated_membership.id,
    'profile_id', updated_membership.profile_id,
    'plan_id', updated_membership.plan_id,
    'start_date', updated_membership.start_date,
    'end_date', updated_membership.end_date,
    'expires_at', updated_membership.expires_at,
    'status', updated_membership.status,
    'payment_status', updated_membership.payment_status,
    'payment_provider', updated_membership.payment_provider,
    'payment_reference', updated_membership.payment_reference,
    'notes', updated_membership.notes,
    'classes_total', updated_membership.classes_total,
    'classes_used', updated_membership.classes_used,
    'available_tokens', case
      when updated_membership.classes_total is null then null
      else greatest(updated_membership.classes_total - updated_membership.classes_used, 0)
    end
  );
end;
$$;

grant execute on function public.get_active_membership(uuid) to authenticated;
grant execute on function public.membership_remaining_tokens(uuid) to authenticated;
grant execute on function public.reserve_class(uuid, uuid, date) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.admin_mark_reservation(uuid, text) to authenticated;
grant execute on function public.get_my_reservations() to authenticated;
grant execute on function public.expire_old_memberships() to authenticated;
grant execute on function public.admin_activate_membership(uuid, uuid, date, integer, integer, text, text, text) to authenticated;
grant execute on function public.admin_update_membership(uuid, uuid, date, text, text, text, text, text, integer, integer) to authenticated;

alter table public.memberships enable row level security;
alter table public.reservations enable row level security;
alter table public.membership_token_movements enable row level security;

drop policy if exists "Students can read own memberships with tokens" on public.memberships;
create policy "Students can read own memberships with tokens"
on public.memberships
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage memberships with tokens" on public.memberships;
create policy "Admins can manage memberships with tokens"
on public.memberships
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Students can read own token movements" on public.membership_token_movements;
create policy "Students can read own token movements"
on public.membership_token_movements
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage token movements" on public.membership_token_movements;
create policy "Admins can manage token movements"
on public.membership_token_movements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Students can call own reservation insert through rpc" on public.reservations;
drop policy if exists "Students can create own reservations" on public.reservations;
drop policy if exists "Students can cancel own reservations" on public.reservations;
drop policy if exists "Students can cancel own reservations only" on public.reservations;
drop policy if exists "Students can read own reservations with tokens" on public.reservations;
create policy "Students can read own reservations with tokens"
on public.reservations
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can manage reservations with tokens" on public.reservations;
create policy "Admins can manage reservations with tokens"
on public.reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Los alumnos NO tienen policy de insert/update/delete directa sobre reservations.
-- Deben reservar/cancelar solo mediante public.reserve_class() y public.cancel_reservation(),
-- para que el cobro/devolucion de tokens sea transaccional y auditable.
