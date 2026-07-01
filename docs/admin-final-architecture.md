# Arquitectura Final Admin KUPAN

Fecha de auditoría: 2026-07-01

## Flujo de lectura

`src/pages/Admin.jsx` usa `useAdminData()` para leer datos administrativos. El hook centraliza:

- `adminDataLoaders`
- `loadAdminDataSnapshot`
- `runAdminLoader`
- `reloadAll`
- `reloadSection`
- `sectionErrors`
- `sectionLoading`

Claves de datos verificadas:

- `profiles`
- `plans`
- `memberships`
- `reservations`
- `wod`
- `schedule`
- `posts`
- `settings`
- `birthdays`
- `upcomingBirthdays`
- `prs`
- `tokenMovements`

Estas claves coinciden con las props consumidas por los módulos de `Admin.jsx`.

## Flujo de mutación

`Admin.jsx` no ejecuta mutaciones directas a Supabase. Las operaciones están delegadas a hooks por dominio:

- WOD: `useAdminWod`
- Horarios: `useAdminSchedule`
- Comunicaciones: `useAdminCommunications`
- Textos: `useAdminSettings`
- Planes: `useAdminPlans`
- Alumnos: `useAdminStudents`
- Reservas: `useAdminReservations`
- Membresías: `useAdminMemberships`

`Admin.jsx` conserva validaciones, feedback, limpieza de drafts y recarga por `affectedSections`.

## Flujo de feedback

`useAdminFeedback` centraliza:

- `message`
- `messageType`
- `showSuccess`
- `showError`
- `showWarning`
- `clearFeedback`

Los hooks de mutación no muestran feedback ni navegan.

## Flujo de recarga

Cada mutación devuelve `affectedSections`. `Admin.jsx` llama `reloadAffectedSections()` y recarga solo las secciones indicadas. Si no hay secciones, usa fallback a `refreshData({ silent: true })`.

Mapa esperado:

- WOD -> `wod`
- Horarios -> `schedule`
- Comunicaciones -> `posts`
- Textos -> `settings`
- Planes -> `plans`
- Alumnos -> `profiles`, `memberships`
- Reservas -> `reservations`, `memberships`, `tokenMovements`
- Membresías -> `memberships`, `profiles`, `tokenMovements`

## Flujo de formularios

Los formularios están en `src/components/admin/forms/`. Son controlados por `draft`, callbacks y `onSubmit`. No importan Supabase, no usan `defaultValue` y no ejecutan mutaciones.

## Flujo de módulos

Los módulos están en `src/components/admin/modules/`. Son presentacionales y reciben datos/callbacks desde `Admin.jsx`.

## Flujo de borrador WOD

`useAdminWodDraft` controla solo persistencia local temporal:

- Clave: `kupan_admin_wod_draft_v1`
- Medio: `localStorage`
- Debounce: 700 ms
- Expiración: 14 días
- Recuperación explícita
- Limpieza tras guardado remoto exitoso

No guarda en Supabase y no reemplaza automáticamente datos remotos.

## Responsabilidades de Admin.jsx

`Admin.jsx` conserva:

- Validación de rol admin.
- Coordinación de hooks.
- Estado de drafts.
- Feedback visible.
- Refs y navegación interna.
- Validaciones de negocio.
- Limpieza posterior al éxito.
- Recargas por sección.

## Integridad verificada

- No se detectaron mutaciones Supabase directas en `Admin.jsx`.
- No se detectaron formularios inline duplicados fuera de búsqueda/acciones globales.
- No se detectó `service_role` en `src`.
- No se detectó uso de la clave WOD draft fuera de Admin/WOD draft.
- `/coach` no importa `useAdminWodDraft`.
