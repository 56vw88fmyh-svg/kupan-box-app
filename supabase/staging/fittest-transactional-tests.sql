begin;

do $$
declare
  test_profile_id uuid;
  test_plan_id uuid;
  test_membership_id uuid;
  test_class_id uuid;
  first_refresh integer;
  second_refresh integer;
begin
  select id into test_profile_id from public.profiles where role = 'admin' limit 1;
  select id into test_plan_id from public.plans where name = '2 veces a la semana';

  if test_profile_id is null or test_plan_id is null then
    raise exception 'Falta el administrador o el plan de prueba';
  end if;

  begin
    insert into public.class_schedule(day_of_week, time, class_name, max_spots)
    values(1, '09:00', 'No debe crearse', 16);
    raise exception 'El limite de 15 no fue aplicado';
  exception when check_violation then
    null;
  end;

  insert into public.class_schedule(day_of_week, time, class_name, max_spots)
  values(1, '09:00', 'Prueba temporal', 15)
  returning id into test_class_id;

  if public.available_spots(test_class_id, current_date + 4) <> 15 then
    raise exception 'La clase no inicia con 15 cupos';
  end if;

  insert into public.memberships(
    profile_id, plan_id, start_date, end_date, expires_at, status,
    payment_status, classes_total, classes_used
  ) values (
    test_profile_id, test_plan_id, current_date - 26, current_date + 3,
    current_date + 3, 'active', 'paid', 9, 0
  ) returning id into test_membership_id;

  perform set_config('request.jwt.claim.sub', test_profile_id::text, true);
  select public.refresh_my_membership_notifications(3) into first_refresh;
  select public.refresh_my_membership_notifications(3) into second_refresh;

  if first_refresh <> 1 or second_refresh <> 0 then
    raise exception 'El recordatorio de renovacion no es idempotente';
  end if;

  insert into public.community_posts(type, title, content, active)
  values('noticia', 'Noticia de prueba temporal', 'Prueba automatica', true);

  if not exists (
    select 1 from public.notifications
    where profile_id = test_profile_id and type = 'news' and title like 'Nueva noticia:%'
  ) then
    raise exception 'La noticia no genero notificacion';
  end if;
end;
$$;

rollback;

select jsonb_build_object(
  'capacity_15', true,
  'renewal_reminder_deduplicated', true,
  'news_notification_created', true,
  'test_data_rolled_back', true
) as fittest_transactional_tests;
