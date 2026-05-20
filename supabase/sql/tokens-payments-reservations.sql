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
    and active_membership.activated_at::date + interval '30 days' <= current_date then
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
create policy "Students can create own reservations"
on public.reservations
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and status = 'reserved'
  and membership_id in (
    select id from public.get_active_membership(auth.uid())
  )
);

drop policy if exists "Students can cancel own reservations" on public.reservations;
drop policy if exists "Students can cancel own reservations only" on public.reservations;
create policy "Students can cancel own reservations"
on public.reservations
for update
to authenticated
using (profile_id = auth.uid() and status = 'reserved')
with check (profile_id = auth.uid() and status = 'cancelled');

drop policy if exists "Admins can manage reservations with tokens" on public.reservations;
create policy "Admins can manage reservations with tokens"
on public.reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
