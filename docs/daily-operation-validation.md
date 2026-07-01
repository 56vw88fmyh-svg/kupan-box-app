# Validación de Operación Diaria KUPAN

Fecha: 2026-07-01

## Checklist diario recomendado

1. Iniciar sesión como admin.
2. Presionar "Actualizar datos" en Admin.
3. Revisar reservas del día.
4. Revisar alumnos con plan vencido o tokens bajos.
5. Revisar WOD del día.
6. Revisar horarios activos.
7. Usar Modo Coach para asistencia.
8. Confirmar que no hay errores visibles para alumnos.

## Uso interno recomendado

KUPAN puede usarse internamente con supervisión mientras se mantienen controles manuales de:

- Registro de alumnos nuevos.
- Activación y renovación de membresías.
- Reservas y cancelaciones.
- Asistencia diaria.
- Revisión de tokens.

## Evidencia de esta validación

- Lint: OK.
- Tests: OK.
- Build: OK.
- Check: OK.
- E2E público/PWA: OK.
- E2E autenticado con mutaciones: pendiente por entorno seguro.

## Qué hacer ante error

- Si falla una reserva, revisar mensaje visible en pantalla.
- Si un alumno no aparece, presionar "Actualizar datos" en Admin.
- Si una membresía no refleja tokens, revisar historial de movimientos.
- Si la PWA queda antigua, usar el aviso "Nueva versión disponible" o recargar la app.

## No hacer en operación diaria

- No modificar datos directamente en Supabase salvo corrección autorizada.
- No usar claves `service_role` en frontend.
- No ejecutar seeds ni scripts destructivos en producción.
- No activar pagos reales desde modo simulado.
