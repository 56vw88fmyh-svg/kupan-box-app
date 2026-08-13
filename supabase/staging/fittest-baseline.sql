-- FITTEST: esquema inicial aislado y sin datos de KUPAN.
-- Diseñado para un proyecto Supabase nuevo. Puede reaplicarse sin duplicar seeds.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  birth_date date,
  level text not null default 'Iniciado' check (level in ('Iniciado', 'Rookie', 'Scaled', 'RX')),
  role text not null default 'student' check (role in ('student', 'coach', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx on public.profiles(lower(email));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name, email, phone, birth_date, level, role, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'birth_date', '') ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'birth_date')::date
      else null
    end,
    case when new.raw_user_meta_data ->> 'level' in ('Iniciado', 'Rookie', 'Scaled', 'RX')
      then new.raw_user_meta_data ->> 'level' else 'Iniciado' end,
    'student',
    'active'
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = coalesce(excluded.phone, public.profiles.phone),
    birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price integer not null check (price >= 0),
  classes_per_week integer,
  is_unlimited boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  start_date date not null,
  end_date date not null,
  expires_at date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'expired', 'cancelled')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_provider text,
  payment_reference text,
  classes_total integer,
  classes_used integer not null default 0 check (classes_used >= 0),
  agreed_price integer,
  agreement_valid_until date,
  agreement_note text,
  activated_at timestamptz not null default now(),
  auto_activated boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (classes_total is null or classes_total >= classes_used)
);

create table if not exists public.class_schedule (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 1 and 7),
  time time not null,
  class_name text not null,
  coach text,
  max_spots integer not null default 15 check (max_spots between 1 and 15),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_of_week, time, class_name)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  class_schedule_id uuid not null references public.class_schedule(id),
  membership_id uuid references public.memberships(id),
  reservation_date date not null,
  status text not null default 'reserved' check (status in ('reserved', 'cancelled', 'attended', 'no_show')),
  token_charged boolean not null default false,
  token_refunded boolean not null default false,
  cancellation_kind text,
  cancellation_reason text,
  cancellation_cutoff_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  attendance_marked_at timestamptz,
  attendance_marked_by uuid references public.profiles(id),
  arrival_status text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reservations_one_active_per_class_date_idx
  on public.reservations(profile_id, class_schedule_id, reservation_date)
  where status in ('reserved', 'attended', 'no_show');
create index if not exists reservations_class_date_idx
  on public.reservations(class_schedule_id, reservation_date, status);

create table if not exists public.membership_token_movements (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  movement_type text not null check (movement_type in ('charge', 'refund', 'expire', 'manual_adjustment')),
  quantity integer not null,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.class_waitlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  class_schedule_id uuid not null references public.class_schedule(id) on delete cascade,
  reservation_date date not null,
  status text not null default 'waiting' check (status in ('waiting', 'promoted', 'left', 'expired')),
  position_hint integer,
  joined_at timestamptz not null default now(),
  unique (profile_id, class_schedule_id, reservation_date)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'noticia' check (type in ('noticia', 'evento', 'aviso')),
  title text not null,
  content text not null,
  event_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.wod (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  title text,
  warmup text,
  strength text,
  workout text,
  time_cap text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  movement text not null,
  value numeric not null,
  unit text not null default 'kg',
  record_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  primary_goal text not null,
  email text,
  previous_experience text,
  desired_class_schedule_id uuid references public.class_schedule(id) on delete set null,
  desired_date date,
  physical_limitations text,
  privacy_accepted boolean not null,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'scheduled', 'completed', 'closed')),
  created_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','plans','memberships','class_schedule','reservations','community_posts','wod'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_set_updated_at', table_name);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.memberships enable row level security;
alter table public.class_schedule enable row level security;
alter table public.reservations enable row level security;
alter table public.membership_token_movements enable row level security;
alter table public.class_waitlist enable row level security;
alter table public.community_posts enable row level security;
alter table public.app_settings enable row level security;
alter table public.wod enable row level security;
alter table public.personal_records enable row level security;
alter table public.trial_requests enable row level security;

create policy "Profiles read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Profiles update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "Public reads active plans" on public.plans for select to anon, authenticated using (active or public.is_admin());
create policy "Admins manage plans" on public.plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users read own memberships" on public.memberships for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy "Admins manage memberships" on public.memberships for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public reads active schedule" on public.class_schedule for select to anon, authenticated using (active or public.is_admin());
create policy "Admins manage schedule" on public.class_schedule for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users read own reservations" on public.reservations for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy "Admins manage reservations" on public.reservations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users read own token movements" on public.membership_token_movements for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy "Users manage own waitlist" on public.class_waitlist for all to authenticated using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());
create policy "Public reads active posts" on public.community_posts for select to anon, authenticated using (active or public.is_admin());
create policy "Admins manage posts" on public.community_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public reads app settings" on public.app_settings for select to anon, authenticated using (true);
create policy "Admins manage app settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated reads wod" on public.wod for select to authenticated using (true);
create policy "Admins manage wod" on public.wod for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users read own records" on public.personal_records for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy "Users manage own records" on public.personal_records for all to authenticated using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());
create policy "Admins read trial requests" on public.trial_requests for select to authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.plans, public.class_schedule, public.community_posts, public.app_settings to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.memberships, public.reservations, public.membership_token_movements, public.class_waitlist, public.wod, public.personal_records to authenticated;
grant insert, update, delete on public.plans, public.class_schedule, public.community_posts, public.app_settings, public.wod to authenticated;

create or replace function public.get_my_profile()
returns setof public.profiles language sql stable security definer set search_path = public, pg_temp as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.get_active_membership(target_profile_id uuid)
returns table (
  id uuid, profile_id uuid, plan_id uuid, start_date date, end_date date, status text,
  notes text, classes_total integer, classes_used integer, expires_at date,
  payment_status text, payment_provider text, payment_reference text,
  activated_at timestamptz, auto_activated boolean, plan_name text, is_unlimited boolean
) language sql stable security definer set search_path = public, pg_temp as $$
  select m.id, m.profile_id, m.plan_id, m.start_date, m.end_date, m.status,
    m.notes, m.classes_total, m.classes_used, m.expires_at, m.payment_status,
    m.payment_provider, m.payment_reference, m.activated_at, m.auto_activated,
    p.name, p.is_unlimited
  from public.memberships m join public.plans p on p.id = m.plan_id
  where m.profile_id = target_profile_id
    and (target_profile_id = auth.uid() or public.is_admin())
    and m.status = 'active' and m.payment_status = 'paid'
    and current_date between m.start_date and m.end_date
  order by m.end_date desc limit 1;
$$;

create or replace function public.membership_remaining_tokens(target_membership_id uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select case when p.is_unlimited then null else greatest(m.classes_total - m.classes_used, 0) end
  from public.memberships m join public.plans p on p.id = m.plan_id
  where m.id = target_membership_id and (m.profile_id = auth.uid() or public.is_admin());
$$;

create or replace function public.available_spots(class_id uuid, target_date date)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select greatest(cs.max_spots - count(r.id)::integer, 0)
  from public.class_schedule cs
  left join public.reservations r on r.class_schedule_id = cs.id
    and r.reservation_date = target_date and r.status in ('reserved', 'attended', 'no_show')
  where cs.id = class_id group by cs.max_spots;
$$;

create or replace function public.get_my_reservations()
returns table (
  id uuid, profile_id uuid, class_schedule_id uuid, membership_id uuid,
  reservation_date date, status text, token_charged boolean, token_refunded boolean,
  cancelled_at timestamptz, created_at timestamptz,
  schedule_day_of_week integer, schedule_time time, schedule_class_name text,
  schedule_coach text, schedule_max_spots integer
) language sql stable security definer set search_path = public, pg_temp as $$
  select r.id, r.profile_id, r.class_schedule_id, r.membership_id, r.reservation_date,
    r.status, r.token_charged, r.token_refunded, r.cancelled_at, r.created_at,
    cs.day_of_week, cs.time, cs.class_name, cs.coach, cs.max_spots
  from public.reservations r join public.class_schedule cs on cs.id = r.class_schedule_id
  where r.profile_id = auth.uid() order by r.reservation_date desc, cs.time desc;
$$;

create or replace function public.reserve_class(target_profile_id uuid, target_class_schedule_id uuid, target_reservation_date date)
returns public.reservations language plpgsql security definer set search_path = public, pg_temp as $$
declare membership_row record; class_row public.class_schedule; reservation_row public.reservations; charged boolean;
begin
  if auth.uid() is null or (auth.uid() <> target_profile_id and not public.is_admin()) then raise exception 'Solo puedes reservar con tu propio perfil.'; end if;
  select * into class_row from public.class_schedule where id = target_class_schedule_id and active for update;
  if class_row.id is null then raise exception 'Clase no disponible.'; end if;
  if extract(isodow from target_reservation_date)::integer <> class_row.day_of_week then raise exception 'La fecha no corresponde al horario.'; end if;
  if target_reservation_date < current_date then raise exception 'No puedes reservar una clase pasada.'; end if;
  if now() > ((target_reservation_date::timestamp + class_row.time) at time zone 'America/Santiago') - interval '30 minutes' then raise exception 'Las reservas cierran 30 minutos antes.'; end if;
  if public.available_spots(target_class_schedule_id, target_reservation_date) <= 0 then raise exception 'Clase completa.'; end if;
  select * into membership_row from public.get_active_membership(target_profile_id) limit 1;
  if membership_row.id is null then raise exception 'Necesitas una membresia activa y pagada para reservar.'; end if;
  charged := not membership_row.is_unlimited;
  if charged and membership_row.classes_used >= membership_row.classes_total then raise exception 'No tienes tokens disponibles.'; end if;
  insert into public.reservations(profile_id, class_schedule_id, membership_id, reservation_date, token_charged)
  values(target_profile_id, target_class_schedule_id, membership_row.id, target_reservation_date, charged)
  returning * into reservation_row;
  if charged then
    update public.memberships set classes_used = classes_used + 1 where id = membership_row.id;
    insert into public.membership_token_movements(membership_id, profile_id, reservation_id, movement_type, quantity, reason)
    values(membership_row.id, target_profile_id, reservation_row.id, 'charge', -1, 'Reserva de clase');
  end if;
  return reservation_row;
end;
$$;

create or replace function public.cancel_reservation(target_reservation_id uuid, reason_input text default null)
returns public.reservations language plpgsql security definer set search_path = public, pg_temp as $$
declare reservation_row public.reservations; class_time time; refundable boolean;
begin
  select r.* into reservation_row from public.reservations r where r.id = target_reservation_id for update;
  if reservation_row.id is null or (reservation_row.profile_id <> auth.uid() and not public.is_admin()) then raise exception 'Reserva no disponible.'; end if;
  select time into class_time from public.class_schedule where id = reservation_row.class_schedule_id;
  refundable := reservation_row.token_charged and now() <= ((reservation_row.reservation_date::timestamp + class_time) at time zone 'America/Santiago') - interval '30 minutes';
  update public.reservations set status = 'cancelled', cancelled_at = now(), cancellation_reason = reason_input,
    cancellation_kind = case when refundable then 'timely' else 'late' end, token_refunded = refundable
  where id = reservation_row.id returning * into reservation_row;
  if refundable then
    update public.memberships set classes_used = greatest(classes_used - 1, 0) where id = reservation_row.membership_id;
    insert into public.membership_token_movements(membership_id, profile_id, reservation_id, movement_type, quantity, reason)
    values(reservation_row.membership_id, reservation_row.profile_id, reservation_row.id, 'refund', 1, 'Cancelacion oportuna');
  end if;
  return reservation_row;
end;
$$;

create or replace function public.join_class_waitlist(target_class_schedule_id uuid, target_reservation_date date)
returns public.class_waitlist language plpgsql security definer set search_path = public, pg_temp as $$
declare entry public.class_waitlist;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesion.'; end if;
  insert into public.class_waitlist(profile_id, class_schedule_id, reservation_date, position_hint)
  values(auth.uid(), target_class_schedule_id, target_reservation_date,
    1 + (select count(*) from public.class_waitlist where class_schedule_id = target_class_schedule_id and reservation_date = target_reservation_date and status = 'waiting'))
  on conflict(profile_id, class_schedule_id, reservation_date) do update set status = 'waiting', joined_at = now()
  returning * into entry;
  return entry;
end;
$$;

create or replace function public.leave_class_waitlist(target_waitlist_id uuid)
returns public.class_waitlist language plpgsql security definer set search_path = public, pg_temp as $$
declare entry public.class_waitlist;
begin
  update public.class_waitlist set status = 'left'
  where id = target_waitlist_id and (profile_id = auth.uid() or public.is_admin()) returning * into entry;
  return entry;
end;
$$;

create or replace function public.request_trial_class(
  full_name text, phone text, primary_goal text, email text default null,
  previous_experience text default null, desired_class_schedule_id uuid default null,
  desired_date date default null, physical_limitations text default null,
  privacy_accepted boolean default false
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare request_id uuid;
begin
  if not privacy_accepted then raise exception 'Debes aceptar la politica de privacidad.'; end if;
  if length(trim(full_name)) < 2 or length(trim(phone)) < 6 then raise exception 'Completa nombre y telefono.'; end if;
  insert into public.trial_requests(full_name, phone, primary_goal, email, previous_experience, desired_class_schedule_id, desired_date, physical_limitations, privacy_accepted)
  values(trim(full_name), trim(phone), trim(primary_goal), nullif(lower(trim(email)), ''), previous_experience, desired_class_schedule_id, desired_date, physical_limitations, true)
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.get_public_box_news(limit_count integer default 5)
returns setof public.community_posts language sql stable security definer set search_path = public, pg_temp as $$
  select * from public.community_posts where active order by created_at desc limit greatest(1, least(limit_count, 20));
$$;

create or replace function public.birthdays_this_month()
returns table(profile_id uuid, full_name text, birth_day integer, birth_month integer, turning_age integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select id, profiles.full_name, extract(day from birth_date)::integer, extract(month from birth_date)::integer,
    extract(year from age(make_date(extract(year from current_date)::integer, extract(month from birth_date)::integer, extract(day from birth_date)::integer), birth_date))::integer
  from public.profiles where status = 'active' and birth_date is not null and extract(month from birth_date) = extract(month from current_date)
  order by extract(day from birth_date);
$$;

create or replace function public.admin_get_profiles() returns setof public.profiles language sql stable security definer set search_path = public, pg_temp as $$ select * from public.profiles where public.is_admin() order by full_name; $$;
create or replace function public.admin_get_plans() returns setof public.plans language sql stable security definer set search_path = public, pg_temp as $$ select * from public.plans where public.is_admin() order by price; $$;
create or replace function public.admin_get_memberships() returns setof public.memberships language sql stable security definer set search_path = public, pg_temp as $$ select * from public.memberships where public.is_admin() order by created_at desc; $$;
create or replace function public.admin_get_reservations() returns setof public.reservations language sql stable security definer set search_path = public, pg_temp as $$ select * from public.reservations where public.is_admin() order by reservation_date desc, created_at desc; $$;
create or replace function public.admin_get_wod() returns setof public.wod language sql stable security definer set search_path = public, pg_temp as $$ select * from public.wod where public.is_admin() order by date desc; $$;
create or replace function public.admin_get_schedule() returns setof public.class_schedule language sql stable security definer set search_path = public, pg_temp as $$ select * from public.class_schedule where public.is_admin() order by day_of_week, time; $$;
create or replace function public.admin_get_community_posts() returns setof public.community_posts language sql stable security definer set search_path = public, pg_temp as $$ select * from public.community_posts where public.is_admin() order by created_at desc; $$;
create or replace function public.admin_get_app_settings() returns setof public.app_settings language sql stable security definer set search_path = public, pg_temp as $$ select * from public.app_settings where public.is_admin() order by key; $$;
create or replace function public.admin_get_personal_records() returns setof public.personal_records language sql stable security definer set search_path = public, pg_temp as $$ select * from public.personal_records where public.is_admin() order by created_at desc; $$;
create or replace function public.admin_get_token_movements() returns setof public.membership_token_movements language sql stable security definer set search_path = public, pg_temp as $$ select * from public.membership_token_movements where public.is_admin() order by created_at desc; $$;
create or replace function public.admin_get_operational_metrics() returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.is_admin() then jsonb_build_object('active_students', (select count(*) from public.profiles where role='student' and status='active'), 'active_memberships', (select count(*) from public.memberships where status='active' and end_date >= current_date), 'upcoming_reservations', (select count(*) from public.reservations where status='reserved' and reservation_date >= current_date)) else '{}'::jsonb end;
$$;

create or replace function public.coach_mark_attendance(target_reservation_id uuid, attended_input boolean, arrival_status_input text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado.'; end if;
  update public.reservations set status = case when attended_input then 'attended' else 'no_show' end,
    attendance_marked_at = now(), attendance_marked_by = auth.uid(), arrival_status = arrival_status_input
  where id = target_reservation_id;
end;
$$;

create or replace function public.admin_cancel_reservation(target_reservation_id uuid, reason_input text default null)
returns public.reservations language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado.'; end if;
  return public.cancel_reservation(target_reservation_id, reason_input);
end;
$$;

create or replace function public.admin_reserve_for_student(target_profile_id uuid, target_class_schedule_id uuid, target_reservation_date date, allow_without_membership boolean default false, admin_note text default null)
returns public.reservations language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.reservations;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado.'; end if;
  if not allow_without_membership then return public.reserve_class(target_profile_id, target_class_schedule_id, target_reservation_date); end if;
  if public.available_spots(target_class_schedule_id, target_reservation_date) <= 0 then raise exception 'Clase completa.'; end if;
  insert into public.reservations(profile_id, class_schedule_id, reservation_date, admin_note)
  values(target_profile_id, target_class_schedule_id, target_reservation_date, admin_note) returning * into result;
  return result;
end;
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile(), public.get_active_membership(uuid), public.membership_remaining_tokens(uuid), public.get_my_reservations(), public.reserve_class(uuid,uuid,date), public.cancel_reservation(uuid,text), public.join_class_waitlist(uuid,date), public.leave_class_waitlist(uuid) to authenticated;
grant execute on function public.available_spots(uuid,date), public.get_public_box_news(integer), public.birthdays_this_month(), public.request_trial_class(text,text,text,text,text,uuid,date,text,boolean) to anon, authenticated;
grant execute on function public.admin_get_profiles(), public.admin_get_plans(), public.admin_get_memberships(), public.admin_get_reservations(), public.admin_get_wod(), public.admin_get_schedule(), public.admin_get_community_posts(), public.admin_get_app_settings(), public.admin_get_personal_records(), public.admin_get_token_movements(), public.admin_get_operational_metrics(), public.coach_mark_attendance(uuid,boolean,text), public.admin_cancel_reservation(uuid,text), public.admin_reserve_for_student(uuid,uuid,date,boolean,text) to authenticated;

insert into public.plans(name, price, classes_per_week, is_unlimited, active) values
  ('2 veces a la semana', 30000, 2, false, true),
  ('3 veces a la semana', 40000, 3, false, true),
  ('Plan full', 50000, null, true, true)
on conflict(name) do update set price=excluded.price, classes_per_week=excluded.classes_per_week, is_unlimited=excluded.is_unlimited, active=true;

insert into public.app_settings(key, value) values
  ('gym_id', 'fittest'),
  ('default_class_capacity', '15'),
  ('reservation_closes_minutes', '30'),
  ('cancellation_refund_minutes', '30'),
  ('membership_duration_days', '30'),
  ('membership_renewal_reminder_days', '3'),
  ('general_hours', 'Lunes a viernes, 09:00-22:00\nSabado y domingo, 09:00-13:00'),
  ('home_eyebrow', 'CrossFit & Hyrox'),
  ('home_title', 'Reserva tu clase y entrena en FITTEST.'),
  ('home_body', 'Open Box, Hyrox y entrenamiento personalizado en Penaflor.'),
  ('reservations_title', 'Agenda tu clase FITTEST.'),
  ('reservations_body', 'Elige un horario publicado, confirma uno de los 15 cupos y entrena con nosotros.'),
  ('community_phrase', 'CrossFit & Hyrox')
on conflict(key) do update set value=excluded.value, updated_at=now();

insert into public.community_posts(type, title, content, active)
select 'noticia', 'Bienvenidos a FITTEST', 'Este sera el espacio para noticias y novedades del centro de entrenamiento.', true
where not exists (select 1 from public.community_posts where title = 'Bienvenidos a FITTEST');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='memberships') then alter publication supabase_realtime add table public.memberships; end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='reservations') then alter publication supabase_realtime add table public.reservations; end if;
  end if;
end $$;

commit;
