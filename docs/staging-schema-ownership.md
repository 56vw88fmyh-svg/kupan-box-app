# Ownership de Objetos Schema KUPAN

Fecha: 2026-07-01

| Objeto | Baseline | SQL modular | Propietario final | Accion |
| --- | --- | --- | --- | --- |
| `profiles` | Pendiente | RLS/RPC/trigger | Baseline | BASELINE CREA, MÓDULO ALTERA |
| `plans` | Pendiente | RLS/RPC/admin mutations | Baseline | BASELINE CREA, MÓDULO ALTERA |
| `memberships` | Pendiente | tokens/payments altera | Baseline + modulo tokens | BASELINE CREA, MÓDULO ALTERA |
| `class_schedule` | Pendiente | admin/coach/reservas | Baseline | BASELINE CREA, MÓDULO ALTERA |
| `reservations` | Pendiente | tokens/manual reservations altera | Baseline + modulo tokens | BASELINE CREA, MÓDULO ALTERA |
| `wod` | Pendiente | admin/community RPC | Baseline | BASELINE CREA, MÓDULO ALTERA |
| `community_posts` | Pendiente | admin/community RPC | Baseline | BASELINE CREA, MÓDULO ALTERA |
| `app_settings` | Pendiente | `app-settings.sql` crea | Revisar baseline | DUPLICADO POTENCIAL |
| `personal_records` | Pendiente | PR migration crea/altera | Revisar baseline | DUPLICADO POTENCIAL |
| `exercises` | Pendiente | PR migration crea | Modulo PR | MÓDULO CREA |
| `membership_token_movements` | Pendiente | tokens SQL crea | Modulo tokens | MÓDULO CREA |
| `notifications` | Pendiente | notifications SQL crea | Modulo notifications | MÓDULO CREA |
| `is_admin` | Pendiente | admin RLS crea | Modulo admin | REVISIÓN MANUAL |
| `on_auth_user_created` | Pendiente | admin RLS crea trigger | Modulo admin | REVISIÓN MANUAL |
| `set_updated_at` | Pendiente | PR migration/app settings | Revisar duplicado | REVISIÓN MANUAL |

## Duplicados

No se resuelven duplicados hasta tener baseline real. Si baseline y modulo difieren, se debe crear migracion explicita; no editar payloads frontend.
