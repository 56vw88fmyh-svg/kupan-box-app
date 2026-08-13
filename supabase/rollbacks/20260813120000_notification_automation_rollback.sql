-- Reversion segura de la automatizacion, sin borrar notificaciones ni columnas.
-- El frontend anterior ignora dedupe_key y tolera tipos desconocidos.

begin;

drop trigger if exists notify_active_users_about_news_trigger on public.community_posts;
drop function if exists public.notify_active_users_about_news();
drop function if exists public.refresh_my_membership_notifications(integer);

commit;
