-- Keep each athlete's profile in sync after admin membership changes and reservations.
-- Realtime still respects the existing RLS policies on these tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'memberships',
    'membership_token_movements',
    'reservations'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;
