-- Textos principales compartidos de KUPAN.
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "Anyone can read app settings" on public.app_settings;
create policy "Anyone can read app settings"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage app settings" on public.app_settings;
create policy "Admins can manage app settings"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_settings (key, value)
values
  ('home_eyebrow', 'Entrena fuerte, entrena acompañado'),
  ('home_title', 'Reserva tu clase y ven a darlo todo.'),
  ('home_body', 'Somos comunidad, esfuerzo y progreso: revisa horarios, WOD y cupos para llegar listo al box.'),
  ('reservations_title', 'Reserva tu clase y ven a darlo todo.'),
  ('reservations_body', 'Elige horario, confirma tu cupo y deja tu entrenamiento listo. Somos comunidad, esfuerzo y progreso.'),
  ('community_phrase', 'El WOD termina cuando termina el último compañero')
on conflict (key) do nothing;
