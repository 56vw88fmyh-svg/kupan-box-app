-- Auditoria de seguridad KUPAN.
-- Ejecutar en Supabase SQL Editor para revisar RLS, policies y funciones clave.

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'plans',
    'memberships',
    'class_schedule',
    'reservations',
    'personal_records',
    'wod',
    'community_posts',
    'app_settings'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'plans',
    'memberships',
    'class_schedule',
    'reservations',
    'personal_records',
    'wod',
    'community_posts',
    'app_settings'
  )
order by tablename, policyname;

select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_admin',
    'has_active_membership',
    'birthdays_this_month',
    'upcoming_birthdays',
    'available_spots',
    'handle_new_user',
    'guard_profile_update',
    'guard_reservation_write',
    'set_updated_at'
  )
order by routine_name;
