-- Sincronizar usuarios de Supabase Auth hacia public.profiles.
-- Usar si un usuario existe en Authentication > Users, pero no aparece en Admin > Alumnos.

insert into public.profiles (
  id,
  full_name,
  email,
  phone,
  birth_date,
  level,
  role,
  status,
  created_at,
  updated_at
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Atleta KUPAN'),
  u.email,
  nullif(u.raw_user_meta_data->>'phone', ''),
  coalesce(nullif(u.raw_user_meta_data->>'birth_date', '')::date, current_date),
  case
    when u.raw_user_meta_data->>'level' in ('Iniciado', 'Rookie', 'Scaled', 'RX')
      then u.raw_user_meta_data->>'level'
    else 'Iniciado'
  end,
  case
    when lower(u.email) = 'vaas.arismendi@gmail.com' then 'admin'
    else 'student'
  end,
  'active',
  coalesce(u.created_at, now()),
  now()
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
)
on conflict (id) do nothing;

select
  p.full_name,
  p.email,
  p.level,
  p.role,
  p.status,
  p.created_at
from public.profiles p
order by p.created_at desc;
