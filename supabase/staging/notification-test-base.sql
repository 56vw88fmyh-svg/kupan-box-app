-- Base minima y descartable para validar notificaciones en KUPAN Staging.
-- No contiene ni copia datos de produccion.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null,
  role text not null default 'student' check (role in ('student', 'coach', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'noticia',
  title text not null,
  content text,
  event_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.community_posts enable row level security;

drop policy if exists "Profiles read own or admin" on public.profiles;
create policy "Profiles read own or admin"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Memberships read own or admin" on public.memberships;
create policy "Memberships read own or admin"
on public.memberships for select to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "Community read active or admin" on public.community_posts;
create policy "Community read active or admin"
on public.community_posts for select to authenticated
using (active = true or public.is_admin());

drop policy if exists "Admins manage community" on public.community_posts;
create policy "Admins manage community"
on public.community_posts for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.profiles, public.memberships, public.community_posts to authenticated;
grant insert, update, delete on public.community_posts to authenticated;

