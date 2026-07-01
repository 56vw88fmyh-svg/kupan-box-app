# Checklist de Release Producción KUPAN

Fecha: 2026-07-01

## Estado actual

No abrir masivamente todavía. Clasificación actual: piloto limitado pendiente de validación manual real.

## Antes de abrir a alumnos

- Confirmar URL productiva.
- Confirmar Deployment ID.
- Confirmar variables Vercel.
- Confirmar Supabase Auth URLs.
- Confirmar respaldo.
- Confirmar deploy anterior estable.
- Confirmar responsable rollback.
- Ejecutar prueba real alumno.
- Ejecutar prueba real coach.
- Ejecutar prueba real admin.
- Ejecutar reserva y cancelación una sola vez.
- Validar tokens antes/después.
- Validar iPhone.
- Validar Android.

## Suite técnica ejecutada

- `npm run lint`: OK.
- `npm test`: OK.
- `npm run build`: OK.
- `npm run check`: OK.
- `npm run test:e2e`: OK parcial, 10 passed, 15 skipped.
- `npm run qa:e2e:authenticated`: OK parcial, 3 passed, 12 skipped.

