-- Sistema interno de notificaciones KUPAN.
-- No implementa push real. Deja lista la base para campana interna y futuros cron/webhooks.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in (
    'plan_expiring',
    'low_tokens',
    'reservation_confirmed',
    'class_reminder',
    'birthday'
  )),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_created_idx
  on public.notifications(profile_id, created_at desc);

create index if not exists notifications_profile_unread_idx
  on public.notifications(profile_id, read)
  where read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications or admin" on public.notifications;
create policy "Users read own notifications or admin"
on public.notifications
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read"
on public.notifications
for update
to authenticated
using (profile_id = auth.uid() or public.is_admin())
with check (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Admins create notifications" on public.notifications;
create policy "Admins create notifications"
on public.notifications
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins delete notifications" on public.notifications;
create policy "Admins delete notifications"
on public.notifications
for delete
to authenticated
using (public.is_admin());

create or replace function public.create_notification(
  target_profile_id uuid,
  notification_title text,
  notification_message text,
  notification_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo admin puede crear notificaciones internas.';
  end if;

  if notification_type not in ('plan_expiring', 'low_tokens', 'reservation_confirmed', 'class_reminder', 'birthday') then
    raise exception 'Tipo de notificacion no valido.';
  end if;

  insert into public.notifications (profile_id, title, message, type)
  values (target_profile_id, notification_title, notification_message, notification_type)
  returning id into notification_id;

  return notification_id;
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text) to authenticated;

-- Tipos preparados:
-- plan_expiring: plan por vencer
-- low_tokens: tokens bajos
-- reservation_confirmed: reserva confirmada
-- class_reminder: recordatorio de clase
-- birthday: cumpleaños
