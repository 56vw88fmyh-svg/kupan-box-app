create table if not exists public.admin_security_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('password_recovery_email', 'temporary_password')),
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_security_audit enable row level security;

drop policy if exists "admin_security_audit_admin_select" on public.admin_security_audit;
create policy "admin_security_audit_admin_select"
on public.admin_security_audit
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

drop policy if exists "admin_security_audit_admin_insert" on public.admin_security_audit;
create policy "admin_security_audit_admin_insert"
on public.admin_security_audit
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  )
);

create index if not exists admin_security_audit_target_idx on public.admin_security_audit(target_user_id, created_at desc);
create index if not exists admin_security_audit_admin_idx on public.admin_security_audit(admin_user_id, created_at desc);
