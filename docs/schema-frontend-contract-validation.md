# Validacion Contratos Frontend vs Schema KUPAN

Fecha: 2026-07-01

## Estado

COMPARISON NOT EXECUTED. Falta baseline validado.

## Tablas y columnas observadas en frontend

### `profiles`

- `id`
- `full_name`
- `email`
- `phone`
- `birth_date`
- `level`
- `role`
- `status`
- `created_at`

### `plans`

- `id`
- `name`
- `price`
- `classes_per_week`
- `is_unlimited`
- `active`

### `memberships`

- `id`
- `profile_id`
- `plan_id`
- `start_date`
- `end_date`
- `expires_at`
- `status`
- `payment_status`
- `payment_provider`
- `payment_reference`
- `classes_total`
- `classes_used`
- `notes`
- `activated_at`
- `auto_activated`

### `class_schedule`

- `id`
- `day_of_week`
- `time`
- `class_name`
- `coach`
- `max_spots`
- `active`

### `reservations`

- `id`
- `profile_id`
- `class_schedule_id`
- `membership_id`
- `reservation_date`
- `status`
- `token_charged`
- `cancelled_at`
- `notes`
- relaciones con `profiles` y `class_schedule`

### `wod`

- `id`
- `date`
- `title`
- `warmup`
- `strength`
- `workout`
- `time_cap`
- `notes`

### `community_posts`

- `id`
- `type`
- `title`
- `content`
- `event_date`
- `active`
- `created_at`

### `app_settings`

- `key`
- `value`

### `personal_records`

- `id`
- `profile_id`
- `user_id`
- `movement`
- `exercise_name`
- `record_type`
- `value`
- `unit`
- `record_date`
- `achieved_at`
- `notes`
- `created_at`

### `notifications`

- `id`
- `profile_id`
- `title`
- `message`
- `type`
- `read`
- `created_at`

## RPC usadas

Ver `docs/staging-schema-inventory.md`.

## Resultado

No se cambia ningun payload frontend. La compatibilidad debe confirmarse despues de exportar y aplicar el baseline en una base vacia.
