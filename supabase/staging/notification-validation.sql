-- Prueba transaccional: valida noticias, renovacion y deduplicacion sin dejar datos.

begin;

insert into public.profiles (id, full_name, role, status) values
  ('10000000-0000-4000-8000-000000000001', 'Admin Staging', 'admin', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'Alumno Staging', 'student', 'active');

insert into public.memberships (profile_id, start_date, end_date, status, payment_status)
values (
  '20000000-0000-4000-8000-000000000002',
  current_date - 27,
  current_date + 2,
  'active',
  'paid'
);

insert into public.community_posts (type, title, content, active)
values ('noticia', 'Prueba de noticias', 'Aviso interno del centro para staging.', true);

set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';
select public.refresh_my_membership_notifications(3);
select public.refresh_my_membership_notifications(3);
reset role;

do $$
declare
  news_count integer;
  renewal_count integer;
begin
  select count(*) into news_count
  from public.notifications
  where type = 'news';

  select count(*) into renewal_count
  from public.notifications
  where type = 'plan_expiring';

  if news_count <> 2 then
    raise exception 'Validacion fallida: se esperaban 2 avisos de noticia y se obtuvieron %.', news_count;
  end if;

  if renewal_count <> 1 then
    raise exception 'Validacion fallida: se esperaba 1 recordatorio sin duplicados y se obtuvieron %.', renewal_count;
  end if;
end;
$$;

rollback;

select 'NOTIFICATION_AUTOMATION_OK' as validation_result;
