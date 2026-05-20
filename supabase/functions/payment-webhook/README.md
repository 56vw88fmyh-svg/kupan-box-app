# Edge Function `payment-webhook`

Prepara activacion automatica de membresias KUPAN cuando un pago sea confirmado.

No implementa pagos falsos como reales. Para pruebas existe modo simulado, pero exige sesion admin.

## Variables

```bash
SUPABASE_SERVICE_ROLE_KEY=...
PAYMENT_WEBHOOK_SECRET=...
```

Configurar:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
supabase secrets set PAYMENT_WEBHOOK_SECRET=UN_SECRETO_LARGO
```

## Deploy

```bash
supabase functions deploy payment-webhook
```

## Payload esperado

```json
{
  "provider": "mercado_pago",
  "payment_reference": "referencia_unica_del_pago",
  "profile_id": "uuid_del_alumno",
  "plan_id": "uuid_del_plan",
  "status": "paid"
}
```

Para pruebas admin:

```json
{
  "provider": "manual_test",
  "payment_reference": "test-123",
  "profile_id": "uuid_del_alumno",
  "plan_id": "uuid_del_plan",
  "status": "paid",
  "simulated": true
}
```

El modo simulado debe llamarse desde un usuario admin logueado.

## Reglas

- Activa 30 dias desde hoy.
- Marca pago como `paid`.
- Deja `auto_activated = true`.
- Calcula `classes_total` desde el plan.
- Pone `classes_used = 0`.
- Evita duplicar activaciones con la misma `payment_reference`.
