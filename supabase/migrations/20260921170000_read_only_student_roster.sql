-- Additive migration. Does not change memberships, balances or existing RLS.
begin;

create table public.student_roster_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null check (char_length(label) between 1 and 100),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
alter table public.student_roster_links enable row level security;
revoke all on public.student_roster_links from public, anon, authenticated;

create function public.admin_create_student_roster_link(link_label text, valid_days integer default 90)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  secret text;
  link_id uuid;
  expiry timestamptz;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Acceso restringido' using errcode = '42501';
  end if;
  if valid_days is null or valid_days < 1 or valid_days > 365
     or link_label is null or char_length(trim(link_label)) not between 1 and 100 then
    raise exception 'Etiqueta o vigencia no válida' using errcode = '22023';
  end if;
  -- Two independent UUIDv4 values provide 244 random bits; only the hash is stored.
  secret := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  expiry := now() + make_interval(days => valid_days);
  insert into public.student_roster_links (token_hash, label, created_by, expires_at)
  values (encode(sha256(convert_to(secret, 'UTF8')), 'hex'), trim(link_label), auth.uid(), expiry)
  returning id into link_id;
  return jsonb_build_object('id', link_id, 'access_token', secret, 'expires_at', expiry);
end;
$$;

create function public.admin_list_student_roster_links()
returns table (id uuid, label text, created_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = '' stable
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Acceso restringido' using errcode = '42501';
  end if;
  return query select l.id, l.label, l.created_at, l.expires_at
  from public.student_roster_links l
  where l.revoked_at is null and l.expires_at > now()
  order by l.created_at desc;
end;
$$;

create function public.admin_revoke_student_roster_link(link_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Acceso restringido' using errcode = '42501';
  end if;
  update public.student_roster_links set revoked_at = now()
  where id = link_id and revoked_at is null;
end;
$$;

create function public.read_student_roster(access_token text)
returns jsonb
language plpgsql security definer set search_path = '' stable
as $$
declare
  local_today date := (now() at time zone 'America/Santiago')::date;
  result jsonb;
begin
  if access_token is null or access_token !~ '^[a-f0-9]{64}$' or not exists (
    select 1 from public.student_roster_links l
    where l.token_hash = encode(sha256(convert_to(access_token, 'UTF8')), 'hex')
      and l.revoked_at is null and l.expires_at > now()
  ) then
    raise exception 'Enlace no válido o vencido' using errcode = '42501';
  end if;

  -- One JSON result avoids PostgREST's row limit truncating the roster silently.
  -- No emails, phone numbers, payment references or membership notes are returned.
  select coalesce(jsonb_agg(jsonb_build_object(
    'student_id', p.id,
    'full_name', coalesce(nullif(trim(p.full_name), ''), 'Alumno KUPAN'),
    'membership_id', m.id,
    'plan_name', plan.name,
    'start_date', m.start_date,
    'end_date', m.end_date,
    'effective_end_date', least(m.end_date, coalesce(m.expires_at, m.end_date)),
    'membership_status', m.status,
    'payment_status', m.payment_status,
    'is_unlimited', coalesce(plan.is_unlimited, false),
    'total_tokens', case when plan.is_unlimited then null else coalesce(m.classes_total, 0) end,
    'remaining_tokens', case when plan.is_unlimited then null else greatest(coalesce(m.classes_total, 0) - coalesce(m.classes_used, 0), 0) end
  ) order by p.full_name, p.id), '[]'::jsonb)
  into result
  from public.profiles p
  left join lateral (
    select candidate.* from public.memberships candidate
    where candidate.profile_id = p.id
    order by
      case
        when candidate.status = 'active' and candidate.payment_status = 'paid'
          and candidate.start_date <= local_today
          and least(candidate.end_date, coalesce(candidate.expires_at, candidate.end_date)) >= local_today then 0
        when candidate.status = 'active' and candidate.payment_status = 'paid'
          and candidate.start_date > local_today then 1
        else 2
      end,
      case when candidate.start_date > local_today then candidate.start_date end asc nulls last,
      candidate.end_date desc nulls last, candidate.created_at desc, candidate.id
    limit 1
  ) m on true
  left join public.plans plan on plan.id = m.plan_id
  where p.role = 'student' and p.status = 'active';

  return jsonb_build_object('today', local_today, 'generated_at', now(), 'students', result);
end;
$$;

revoke all on function public.admin_create_student_roster_link(text, integer) from public, anon;
revoke all on function public.admin_list_student_roster_links() from public, anon;
revoke all on function public.admin_revoke_student_roster_link(uuid) from public, anon;
grant execute on function public.admin_create_student_roster_link(text, integer) to authenticated;
grant execute on function public.admin_list_student_roster_links() to authenticated;
grant execute on function public.admin_revoke_student_roster_link(uuid) to authenticated;
revoke all on function public.read_student_roster(text) from public, authenticated;
grant execute on function public.read_student_roster(text) to anon;

notify pgrst, 'reload schema';
commit;
