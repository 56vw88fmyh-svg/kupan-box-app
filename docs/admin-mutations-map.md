# Mapa de Mutaciones Admin KUPAN

Fecha: 2026-06-30

Alcance: Etapa 6, extracción de mutaciones administrativas por dominio. No se cambiaron RPC, payloads, tablas ni RLS.

| Dominio | Función | Archivo actual | Servicio utilizado | Payload preservado | Datos afectados | Secciones a recargar | Riesgo | Idempotencia frontend | Criterio de aceptación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WOD | `saveWod` | `useAdminWod.js` | `wod.upsert(..., { onConflict: 'date' })` | `wodDraft` completo | WOD diario | `wod` | Bajo | `saveWod` bloqueado mientras corre | Guarda una vez y conserva campos |
| Horarios | `saveSchedule` | `useAdminSchedule.js` | `class_schedule.insert/update` | `day_of_week`, `time`, `class_name`, `coach`, `max_spots`, `active` | Horarios | `schedule` | Bajo | `saveSchedule` bloqueado mientras corre | Crear/editar horario sin cambiar modelo |
| Horarios | `toggleSchedule` | `useAdminSchedule.js` | `class_schedule.update` | `{ active: !classItem.active }` por `id` | Horario activo/inactivo | `schedule` | Bajo | Clave `toggleSchedule:id` | Toggle por clase |
| Comunicaciones | `savePost` | `useAdminCommunications.js` | `community_posts.insert/update` | `type`, `title`, `content`, `event_date`, `active` | Noticias/eventos | `posts` | Bajo | `savePost` bloqueado mientras corre | Crear/editar publicación |
| Comunicaciones | `togglePost` | `useAdminCommunications.js` | `community_posts.update` | `{ active: !post.active }` por `id` | Publicación activa/inactiva | `posts` | Bajo | Clave `togglePost:id` | Toggle por post |
| Configuración | `saveTexts` | `useAdminSettings.js` | `saveAppSetting` | Pares `settingKeys -> textDraft[field]` | Textos compartidos | `settings` | Medio | `saveTexts` bloqueado mientras corre | Reporta éxito total o error/partial |
| Planes | `savePlan` | `useAdminPlans.js` | `plans.insert/update` | `name`, `price`, `classes_per_week`, `is_unlimited`, `active` | Planes | `plans` | Medio | `savePlan` bloqueado mientras corre | Crear/editar plan |
| Planes | `togglePlan` | `useAdminPlans.js` | `plans.update` | `{ active: !plan.active }` por `id` | Plan activo/inactivo | `plans` | Medio | Clave `togglePlan:id` | Toggle por plan |
| Alumnos | `createStudent` | `useAdminStudents.js` | Edge Function `create-student` | `full_name`, `email`, `phone`, `birth_date`, `level`, `status`, `temporary_password`, `internal_notes`, `plan_id`, `membership_start_date`, `membership_end_date` | Auth user, profile, membresía opcional | `profiles`, `memberships` | Medio | `createStudent` bloqueado mientras corre | Devuelve credenciales temporales |
| Reservas | `saveManualReservation` | `useAdminReservations.js` | `adminReserveForStudent` / RPC `admin_reserve_for_student` | `profileId`, `classScheduleId`, `reservationDate`, `allowWithoutMembership`, `note` | Reservas, membresía, tokens | `reservations`, `memberships`, `tokenMovements` | Alto | `saveManualReservation` bloqueado mientras corre | No duplica reserva por doble submit |
| Reservas | `updateReservationStatus` | `useAdminReservations.js` | RPC `cancel_reservation` o `admin_mark_reservation` | `target_reservation_id`, `target_status` | Reservas, tokens | `reservations`, `memberships`, `tokenMovements` | Alto | Clave `reservationStatus:id:status` | Cancelar/asistencia sin doble operación |
| Membresías | `saveMembership` | `useAdminMemberships.js` | RPC `admin_activate_membership` | `target_profile_id`, `target_plan_id`, `membership_start_date`, `classes_total_override`, `initial_classes_used`, `payment_provider_input`, `payment_reference_input`, `notes_input` | Membresía, tokens | `memberships`, `profiles`, `tokenMovements` | Alto | `saveMembership` bloqueado mientras corre | Activar plan con tokens migrados |
| Membresías | `saveMembershipEdit` | `useAdminMemberships.js` | RPC `admin_update_membership` | Payload `admin_update_membership` existente | Membresía, tokens | `memberships`, `profiles`, `tokenMovements` | Alto | `saveMembershipEdit` bloqueado mientras corre | Editar sin romper ciclo |
| Membresías | `updateMembershipStatus` | `useAdminMemberships.js` | RPC `admin_update_membership` | Payload existente con `status_input` | Membresía | `memberships`, `profiles`, `tokenMovements` | Alto | Clave `membershipStatus:id:status` | Cambia estado una vez |
| Membresías | `renewMembership` | `useAdminMemberships.js` | RPC `admin_renew_membership` | `target_membership_id` | Nuevo ciclo membresía | `memberships`, `profiles`, `tokenMovements` | Alto | Clave `renewMembership:id` | No doble renovación |
| Membresías | `extendMembershipSevenDays` | `useAdminMemberships.js` | RPC `admin_extend_membership` | `target_membership_id`, `days_input: 7` | Vencimiento membresía | `memberships`, `profiles`, `tokenMovements` | Alto | Clave `extendMembership:id:7` | Extiende una sola vez |
| Membresías | `adjustMembershipTokens` | `useAdminMemberships.js` | RPC `admin_adjust_tokens` | `target_membership_id`, `classes_used_input`, `reason_input` | Tokens, movimientos | `memberships`, `profiles`, `tokenMovements` | Alto | Clave `adjustTokens:id` | Ajuste manual auditado |
| Membresías | `simulateApprovedPayment` | `useAdminMemberships.js` | Edge Function `payment-webhook` | `provider`, `payment_reference`, `profile_id`, `plan_id`, `status`, `simulated` | Membresía por pago simulado | `memberships`, `profiles`, `tokenMovements` | Alto | `simulateApprovedPayment` bloqueado mientras corre | Solo simula pago admin |

## Recargas Globales

Las operaciones extraídas devuelven `affectedSections`. `Admin.jsx` coordina `reloadSection` por sección. `refreshData({ silent: true })` queda como fallback dentro de `reloadAffectedSections` si una mutación no declara secciones afectadas.

## Wrappers que Permanecen en Admin.jsx

Permanecen wrappers de coordinación para:

- Validar admin fresco.
- Validar reglas de negocio existentes.
- Mostrar feedback.
- Limpiar drafts.
- Copiar credenciales.
- Prompt de ajuste de tokens.
- Scroll/foco/navegación.

## Riesgos Pendientes

- `adjustMembershipTokens` sigue usando `window.prompt` desde `Admin.jsx`, igual que antes.
- Algunas recargas por sección pueden necesitar más ajuste fino futuro para dashboards derivados, pero se preservan secciones críticas.
