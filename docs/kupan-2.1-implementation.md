# KUPAN 2.1 — Implementación

## Alcance implementado

- Identidad visual KUPAN 2.1 y tipografías oficiales.
- Planes públicos 8, 12 recomendado y Full; pase diario y primera clase diferenciados.
- Perfil sincronizado con la membresía real: plan, precio acordado, pago, inicio, vencimiento y tokens.
- Actualización del Perfil al volver a la app, recuperar conexión, enfocar ventana y recibir cambios en tiempo real.
- Reservas con ventana de 7 días, cierre a 15 minutos, cupo de 12 y límite diario Full.
- Cancelación oportuna a 45 minutos, tardía, no-show y cancelación KUPAN auditables.
- Lista de espera con promoción atómica y cobro de token solo al confirmar cupo.
- Primera clase gratuita con consentimiento y seguimiento interno.
- Cabina coach con asistencia en lote, tardanza, no-show, reversa auditada y notas privadas.
- Pagos idempotentes por proveedor/referencia y ciclos inclusivos de 30 días.
- Configuración de políticas y métricas comerciales básicas para Admin.

## Migración

Aplicar primero en staging:

```bash
supabase link --project-ref TU_PROJECT_REF_STAGING
supabase migration list --linked
supabase db push --linked
```

Archivo: `supabase/migrations/20260811120000_kupan_21_operations.sql`.

La migración no copia usuarios ni datos. Agrega columnas, tablas, RLS, RPC, auditoría y publicación Realtime. Antes de producción se debe respaldar y ejecutar la matriz de pruebas.

## Prueba Admin → Alumno

1. Como admin, activar un plan pagado para un alumno.
2. Verificar plan, inicio, vencimiento, total y usados en Membresías.
3. Como alumno, abrir Perfil y confirmar plan, precio, pago, días y saldo.
4. Reservar: usados aumenta y disponibles disminuye.
5. Volver a Perfil: la tarjeta se actualiza automáticamente; también existe “Actualizar plan”.
6. Cancelar con 45 minutos o más: el token vuelve una sola vez.
7. Marcar attended/no-show: el token permanece consumido.

## Bloqueos externos

- No se desplegó esta migración a producción.
- No se procesaron pagos reales.
- Mercado Pago requiere secreto productivo y validación oficial de firma antes de habilitar cobros reales.
- E2E autenticado requiere usuarios y variables seguras de staging.

## Rollback

Revertir primero el frontend al despliegue previo. En base de datos no eliminar tablas o columnas con datos: deshabilitar temporalmente la acción defectuosa y preparar una migración compensatoria revisada.
