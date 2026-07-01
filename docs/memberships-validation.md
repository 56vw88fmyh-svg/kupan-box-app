# Validación de Membresías KUPAN

Fecha: 2026-07-01

## Reglas esperadas

- Los planes duran 30 días.
- Los tokens no usados no se acumulan.
- Plan vencido bloquea reserva.
- Sin tokens bloquea reserva.
- Plan Full no descuenta tokens.
- Renovación crea un nuevo ciclo de 30 días.
- Ajuste manual de tokens registra movimiento.

## Estado técnico

- No se cambiaron funciones SQL, RLS ni firmas RPC en esta validación.
- No se ejecutaron migraciones sobre Supabase.
- La validación se limita a frontend, pruebas automáticas y documentación operativa.

## Pruebas manuales pendientes

- Activar plan manualmente desde Admin.
- Renovar plan desde Admin.
- Ajustar tokens usados desde Admin.
- Extender vencimiento.
- Pausar/cancelar membresía.
- Ver tokens actualizados en Perfil alumno.

## Riesgos

- Si alguna función SQL no está aplicada en producción, la app mostrará error real de Supabase.
- La fuente de verdad sigue siendo Supabase; no usar datos locales para corregir membresías.

