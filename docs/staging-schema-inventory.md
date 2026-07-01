# Inventario Esquema Staging KUPAN

Fecha: 2026-07-01

## Resumen

El repositorio contiene SQL modular en `supabase/sql/`, pero no contiene una migracion integral ni dump completo que garantice crear un Supabase vacio desde cero.

## Tablas requeridas

- `profiles`
- `plans`
- `memberships`
- `class_schedule`
- `reservations`
- `wod`
- `community_posts`
- `app_settings`
- `personal_records`
- `membership_token_movements`
- `notifications`
- `exercises`

## Funciones RPC principales

- `is_admin`
- `is_coach_or_admin`
- `get_my_profile`
- `admin_get_profiles`
- `admin_get_plans`
- `admin_get_memberships`
- `admin_get_reservations`
- `admin_get_wod`
- `admin_get_schedule`
- `admin_get_community_posts`
- `admin_get_app_settings`
- `admin_get_personal_records`
- `admin_get_token_movements`
- `get_active_membership`
- `membership_remaining_tokens`
- `reserve_class`
- `cancel_reservation`
- `admin_mark_reservation`
- `admin_activate_membership`
- `admin_update_membership`
- `admin_renew_membership`
- `admin_adjust_tokens`
- `admin_extend_membership`
- `admin_reserve_for_student`
- `coach_get_day_reservations`
- `coach_get_manual_reservation_profiles`
- `coach_get_manual_reservation_memberships`
- `birthdays_this_month`
- `upcoming_birthdays`
- `get_public_todays_wod`
- `get_public_good_vibes_ranking`
- `get_public_box_news`
- `get_public_recent_prs`
- `get_public_pr_ranking`
- `create_notification`
- `expire_old_memberships`

## Edge Functions

- `create-student`
- `payment-webhook`

## Archivos SQL

| Archivo | Objetos creados | Objetos alterados | Dependencias | Idempotencia | Staging vacio | Riesgo reaplicacion |
| --- | --- | --- | --- | --- | --- | --- |
| `app-settings.sql` | `app_settings`, policies, trigger | RLS `app_settings` | `set_updated_at`, `is_admin` | Parcial | Parcial | Bajo/medio por trigger si ya existe |
| `admin-rls-fix.sql` | RPC admin, policies, `is_admin`, trigger auth | RLS sobre tablas base | Tablas base existentes | Parcial | No | Medio por policies duplicadas si no se limpian |
| `community-public-feed.sql` | RPC publicas | No | `wod`, `reservations`, `profiles`, `community_posts`, `personal_records` | Si para functions | No | Bajo |
| `notifications.sql` | `notifications`, indices, policies, RPC | RLS notifications | `profiles`, `is_admin` | Alta | Parcial | Bajo |
| `coach-mode.sql` | RPC coach/admin | No | `profiles`, `reservations`, `class_schedule`, `memberships` | Si para functions | No | Bajo |
| `admin-manual-reservations.sql` | RPC reserva manual/coach | `reservations.notes` | Tablas base y token movements | Parcial | No | Medio |
| `birthdays-functions.sql` | RPC cumpleaños | No | `profiles` | Si | No | Bajo |
| `get-my-profile.sql` | RPC perfil | No | `profiles` | Si | No | Bajo |
| `tokens-payments-reservations.sql` | `membership_token_movements`, indices, RPC tokens | `memberships`, `reservations`, policies | Tablas base, `plans`, `profiles` | Parcial | No | Alto si constraints/policies se duplican |
| `personal-records-exercises-migration.sql` | `exercises`, `personal_records`, triggers, indices, policies | `personal_records` | `profiles`, auth | Parcial | Parcial | Medio/alto por constraints no valid |
| `pr-ranking.sql` | RPC ranking | No | `personal_records`, `profiles` | Si | No | Bajo |
| `sync-auth-users-profiles.sql` | SQL de sincronizacion | `profiles` esperado | Auth users, profiles | No evaluado | No | Alto si se usa contra datos reales |
| `promote-admin.sql` | Actualizacion de rol | `profiles` | Usuario existente | No aplica | No | Alto si se usa en entorno incorrecto |
| `security-audit.sql` | Consultas auditoria | No | Catalogos Supabase | No modifica | Si | Bajo |

## Triggers identificados

- `set_app_settings_updated_at`
- `on_auth_user_created`
- `set_exercises_updated_at`
- `sync_personal_record_compatibility_before_write`
- `set_personal_records_updated_at`

## Indices identificados

- `memberships_active_lookup_idx`
- `token_movements_membership_idx`
- `notifications_profile_created_idx`
- `notifications_profile_unread_idx`
- Indices de PR y exercises en `personal-records-exercises-migration.sql`.

## RLS

Los SQL habilitan RLS para tablas sensibles, pero dependen de que las tablas base existan antes.

## Objetos base ausentes del repositorio

No hay archivo integral que cree desde cero todas las tablas base: `profiles`, `plans`, `memberships`, `class_schedule`, `reservations`, `wod`, `community_posts`.
