select jsonb_build_object(
  'gym_is_fittest', (select value = 'fittest' from public.app_settings where key = 'gym_id'),
  'capacity_is_15', (select value = '15' from public.app_settings where key = 'default_class_capacity'),
  'reservation_rule_is_30', (select value = '30' from public.app_settings where key = 'reservation_closes_minutes'),
  'cancellation_rule_is_30', (select value = '30' from public.app_settings where key = 'cancellation_refund_minutes'),
  'plans_are_seeded', (select count(*) = 3 from public.plans where active),
  'schedule_is_intentionally_empty', (select count(*) = 0 from public.class_schedule),
  'capacity_constraint_exists', exists (
    select 1 from pg_constraint
    where conrelid = 'public.class_schedule'::regclass
      and pg_get_constraintdef(oid) like '%max_spots%15%'
  ),
  'reservation_function_exists', to_regprocedure('public.reserve_class(uuid,uuid,date)') is not null,
  'notification_refresh_exists', to_regprocedure('public.refresh_my_membership_notifications(integer)') is not null,
  'news_trigger_exists', exists (
    select 1 from pg_trigger
    where tgrelid = 'public.community_posts'::regclass
      and tgname = 'notify_active_users_about_news_trigger'
      and not tgisinternal
  ),
  'notification_rls_enabled', (select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  'no_kupan_seed_data', not exists (
    select 1 from public.app_settings where lower(value) like '%kupan%'
  ) and not exists (
    select 1 from public.community_posts where lower(title || ' ' || content) like '%kupan%'
  )
) as validation;
