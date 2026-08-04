-- Endpoint mínimo para monitorear disponibilidad sin leer datos privados.
create or replace function public.kupan_health_check()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('ok', true, 'checked_at', now());
$$;

revoke all on function public.kupan_health_check() from public;
grant execute on function public.kupan_health_check() to anon, authenticated, service_role;

comment on function public.kupan_health_check() is
  'Comprueba disponibilidad de PostgREST y PostgreSQL sin exponer datos de KUPAN.';
