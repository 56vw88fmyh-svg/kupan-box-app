-- Automatizaciones de notificaciones internas para KUPAN y despliegues white-label.

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  dedupe_key text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists dedupe_key text;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check check (type in (
    'plan_expiring',
    'low_tokens',
    'reservation_confirmed',
    'class_reminder',
    'birthday',
    'news'
  ));

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications(dedupe_key)
  where dedupe_key is not null;

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

grant select, update, insert, delete on public.notifications to authenticated;

create or replace function public.refresh_my_membership_notifications(
  reminder_days integer default 3
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para actualizar tus notificaciones.';
  end if;

  if reminder_days < 0 or reminder_days > 30 then
    raise exception 'El rango de recordatorio debe estar entre 0 y 30 dias.';
  end if;

  insert into public.notifications (
    profile_id,
    title,
    message,
    type,
    dedupe_key
  )
  select
    m.profile_id,
    'Renueva tu membresia',
    format('Tu membresia vence el %s. Renuevala para seguir reservando clases.', to_char(m.end_date, 'DD/MM/YYYY')),
    'plan_expiring',
    format('plan-expiring:%s:%s', m.id, m.end_date)
  from public.memberships m
  where m.profile_id = auth.uid()
    and m.status = 'active'
    and m.payment_status = 'paid'
    and m.end_date between current_date and current_date + reminder_days
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.refresh_my_membership_notifications(integer) from public;
grant execute on function public.refresh_my_membership_notifications(integer) to authenticated;

create or replace function public.notify_active_users_about_news()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.active is distinct from true or new.type is distinct from 'noticia' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.active is true and old.type = 'noticia' then
      return new;
    end if;
  end if;

  insert into public.notifications (
    profile_id,
    title,
    message,
    type,
    dedupe_key
  )
  select
    p.id,
    concat('Nueva noticia: ', new.title),
    coalesce(nullif(left(trim(new.content), 180), ''), 'Hay una nueva noticia disponible en la comunidad.'),
    'news',
    format('news:%s:%s', new.id, p.id)
  from public.profiles p
  where p.status = 'active'
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  return new;
end;
$$;

revoke all on function public.notify_active_users_about_news() from public;

drop trigger if exists notify_active_users_about_news_trigger on public.community_posts;
create trigger notify_active_users_about_news_trigger
after insert or update of active, type on public.community_posts
for each row execute function public.notify_active_users_about_news();

commit;
