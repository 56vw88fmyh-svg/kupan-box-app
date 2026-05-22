-- Reparacion RLS para panel admin KUPAN.
-- Ejecutar en Supabase SQL Editor si el admin inicia sesion, pero el panel no carga datos.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.memberships enable row level security;
alter table public.class_schedule enable row level security;
alter table public.reservations enable row level security;
alter table public.personal_records enable row level security;
alter table public.wod enable row level security;
alter table public.community_posts enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Profiles read own or admin" on public.profiles;
create policy "Profiles read own or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Plans read active or admin" on public.plans;
create policy "Plans read active or admin"
on public.plans
for select
to authenticated
using (active = true or public.is_admin());

drop policy if exists "Admins manage plans" on public.plans;
create policy "Admins manage plans"
on public.plans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Memberships read own or admin" on public.memberships;
create policy "Memberships read own or admin"
on public.memberships
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage memberships" on public.memberships;
create policy "Admins manage memberships"
on public.memberships
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Schedule read active or admin" on public.class_schedule;
create policy "Schedule read active or admin"
on public.class_schedule
for select
to authenticated
using (active = true or public.is_admin());

drop policy if exists "Admins manage schedule" on public.class_schedule;
create policy "Admins manage schedule"
on public.class_schedule
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Reservations read own or admin" on public.reservations;
create policy "Reservations read own or admin"
on public.reservations
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage reservations" on public.reservations;
create policy "Admins manage reservations"
on public.reservations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "PR read own or admin" on public.personal_records;
create policy "PR read own or admin"
on public.personal_records
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "PR manage own or admin" on public.personal_records;
create policy "PR manage own or admin"
on public.personal_records
for all
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists "WOD read all" on public.wod;
create policy "WOD read all"
on public.wod
for select
to authenticated
using (true);

drop policy if exists "Admins manage wod" on public.wod;
create policy "Admins manage wod"
on public.wod
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Community read active or admin" on public.community_posts;
create policy "Community read active or admin"
on public.community_posts
for select
to authenticated
using (active = true or public.is_admin());

drop policy if exists "Admins manage community" on public.community_posts;
create policy "Admins manage community"
on public.community_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Settings read all" on public.app_settings;
create policy "Settings read all"
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Verificacion rapida: debe devolver true con tu usuario admin logueado.
select public.is_admin() as usuario_actual_es_admin;

-- Carga segura del panel admin.
-- Estas funciones evitan que una relacion o policy RLS bloquee la carga completa del panel.

create or replace function public.admin_get_profiles()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar alumnos.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, full_name, email, phone, birth_date, level, role, status, created_at
      from public.profiles
      order by created_at desc nulls last
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_plans()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar planes.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, name, price, classes_per_week, is_unlimited, active, created_at
      from public.plans
      order by price asc nulls last
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_memberships()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar membresias.';
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
        'notes', m.notes,
        'classes_total', m.classes_total,
        'classes_used', m.classes_used,
        'expires_at', m.expires_at,
        'payment_status', m.payment_status,
        'payment_provider', m.payment_provider,
        'payment_reference', m.payment_reference,
        'activated_at', m.activated_at,
        'auto_activated', m.auto_activated,
        'profile', jsonb_build_object(
          'full_name', p.full_name,
          'email', p.email
        ),
        'plan', jsonb_build_object(
          'name', pl.name,
          'price', pl.price,
          'classes_per_week', pl.classes_per_week,
          'is_unlimited', pl.is_unlimited
        )
      )
      order by m.end_date desc nulls last, m.created_at desc
    )
    from public.memberships m
    left join public.profiles p on p.id = m.profile_id
    left join public.plans pl on pl.id = m.plan_id
  ), '[]'::jsonb);
end;
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
        'created_at', r.created_at,
        'profile', jsonb_build_object(
          'full_name', p.full_name,
          'email', p.email
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

create or replace function public.admin_get_wod()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar WOD.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, date, title, warmup, strength, workout, time_cap, notes
      from public.wod
      order by date desc
      limit 14
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_schedule()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar horarios.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, day_of_week, time, class_name, coach, max_spots, active
      from public.class_schedule
      order by day_of_week asc, time asc
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_community_posts()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar comunidad.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select id, type, title, content, event_date, active, created_at
      from public.community_posts
      order by created_at desc nulls last
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_app_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar textos.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(rows))
    from (
      select key, value
      from public.app_settings
      order by key asc
    ) rows
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_personal_records()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar PR.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', pr.id,
        'movement', pr.movement,
        'value', pr.value,
        'unit', pr.unit,
        'record_date', pr.record_date,
        'notes', pr.notes,
        'profile', jsonb_build_object(
          'full_name', p.full_name,
          'email', p.email
        )
      )
      order by pr.value desc nulls last
    )
    from (
      select *
      from public.personal_records
      order by value desc nulls last
      limit 20
    ) pr
    left join public.profiles p on p.id = pr.profile_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_token_movements()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede cargar movimientos de tokens.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', mtm.id,
        'membership_id', mtm.membership_id,
        'profile_id', mtm.profile_id,
        'reservation_id', mtm.reservation_id,
        'movement_type', mtm.movement_type,
        'quantity', mtm.quantity,
        'reason', mtm.reason,
        'created_at', mtm.created_at,
        'created_by', mtm.created_by,
        'profile', jsonb_build_object(
          'full_name', p.full_name,
          'email', p.email
        )
      )
      order by mtm.created_at desc
    )
    from (
      select *
      from public.membership_token_movements
      order by created_at desc
      limit 80
    ) mtm
    left join public.profiles p on p.id = mtm.profile_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_get_profiles() to authenticated;
grant execute on function public.admin_get_plans() to authenticated;
grant execute on function public.admin_get_memberships() to authenticated;
grant execute on function public.admin_get_reservations() to authenticated;
grant execute on function public.admin_get_wod() to authenticated;
grant execute on function public.admin_get_schedule() to authenticated;
grant execute on function public.admin_get_community_posts() to authenticated;
grant execute on function public.admin_get_app_settings() to authenticated;
grant execute on function public.admin_get_personal_records() to authenticated;
grant execute on function public.admin_get_token_movements() to authenticated;

-- Trigger robusto para que cada usuario registrado tenga profile.
-- Si faltan metadatos, no rompe la creacion del usuario; deja valores seguros para que el admin lo corrija.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_birth_date date;
  profile_level text;
begin
  begin
    profile_birth_date := nullif(new.raw_user_meta_data->>'birth_date', '')::date;
  exception when others then
    profile_birth_date := null;
  end;

  profile_level := coalesce(nullif(new.raw_user_meta_data->>'level', ''), 'Iniciado');
  if profile_level not in ('Iniciado', 'Rookie', 'Scaled', 'RX') then
    profile_level := 'Iniciado';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    birth_date,
    level,
    role,
    status
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'Alumno KUPAN'),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(profile_birth_date, current_date),
    profile_level,
    case
      when lower(new.email) in ('kupanbox@gmail.com', 'vaas.arismendi@gmail.com') then 'admin'
      else 'student'
    end,
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    level = coalesce(public.profiles.level, excluded.level),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
