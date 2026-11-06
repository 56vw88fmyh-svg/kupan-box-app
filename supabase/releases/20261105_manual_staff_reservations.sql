-- Coach writes must remain RPC-only. Abort if INSERT/ALL policies changed.
do $permissions$ begin
 if exists(select 1 from pg_policies where schemaname='public' and tablename='reservations' and cmd in ('INSERT','ALL') and with_check is distinct from 'is_admin()') then
  raise exception 'Reservation INSERT policies changed; stop and review.';
 end if;
end $permissions$;
-- Applies only to the audited KUPAN functions. No row updates or policy/grant changes.
do $repair$
declare body text;
begin
 body := pg_get_functiondef('public.admin_reserve_for_student(uuid,uuid,date,boolean,text)'::regprocedure);
 if md5(body) <> '0076acb69c0bee3cf38d5b50c86cdaf0' then
  if md5(body) <> '38790cd6c651aa6837c1cead439ee051' then raise exception 'Manual reservation function changed; stop and review.'; end if;
  body := regexp_replace(body,$cutoff$\s+or now\(\) > public\.kupan_class_starts_at\(target_class_schedule_id,target_reservation_date\) - make_interval\(mins=>public\.kupan_setting_int\('reservation_closes_minutes',15\)\)$cutoff$,'');
  body := regexp_replace(body,$age$\s+if active_membership\.activated_at is not null\s+and active_membership\.activated_at::date \+ interval '30 days' < current_date then\s+raise exception 'El plan del alumno esta vencido\.';\s+end if;$age$,'');
  body := replace(body,$old$raise exception 'La reserva está fuera del período permitido.';$old$,$new$raise exception 'La fecha debe estar entre hoy y los próximos % días.', public.kupan_setting_int('reservation_window_days',7);$new$);
  if md5(body) <> '0076acb69c0bee3cf38d5b50c86cdaf0' then raise exception 'Unexpected manual reservation repair output.'; end if;
  execute body;
 end if;
 body := pg_get_functiondef('public.guard_reservation_write()'::regprocedure);
 if md5(body) <> 'c12093b674285a8f8058921f13f84e2c' then
  if md5(body) <> '29f27608fb00ffc4b55f6c4f0cc0c3ed' then raise exception 'Reservation guard changed; stop and review.'; end if;
  body := regexp_replace(body,'if not public.is_admin\(\) then','if not public.is_coach_or_admin() then');
  if md5(body) <> 'c12093b674285a8f8058921f13f84e2c' then raise exception 'Unexpected reservation guard repair output.'; end if;
  execute body;
 end if;
end $repair$;

insert into supabase_migrations.schema_migrations(version,name,statements)
select '20261105230000','manual_staff_reservations',array[
 pg_get_functiondef('public.admin_reserve_for_student(uuid,uuid,date,boolean,text)'::regprocedure),
 pg_get_functiondef('public.guard_reservation_write()'::regprocedure)
] on conflict(version) do nothing;
