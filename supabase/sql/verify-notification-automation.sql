-- Verificacion estructural, sin leer filas ni datos personales.

select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'dedupe_key'
  ) as dedupe_column_ready,
  to_regclass('public.notifications_dedupe_key_idx') is not null as dedupe_index_ready,
  to_regprocedure('public.refresh_my_membership_notifications(integer)') is not null as renewal_function_ready,
  to_regprocedure('public.notify_active_users_about_news()') is not null as news_function_ready,
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.community_posts'::regclass
      and tgname = 'notify_active_users_about_news_trigger'
      and tgenabled <> 'D'
  ) as news_trigger_ready,
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) like '%news%'
  ) as news_type_ready;
