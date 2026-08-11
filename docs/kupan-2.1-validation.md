# Validación KUPAN 2.1 — 11 de agosto de 2026

## Resultado automatizado

- `npm run lint`: OK.
- `npm test`: OK.
- `npm run build`: OK.
- E2E público: 12 OK, 21 omitidos por falta de credenciales de staging.
- PWA: service worker registrado y respuestas privadas fuera de caché.
- Consola en rutas públicas: sin errores.
- Seguridad estática: sin `service_role`, JWT o secreto en `src`, `public` o configuración frontend.

## Validación visual

Rutas revisadas a 390 × 844, 360 × 800 y 1280 × 800:

- `/`
- `/reservas`
- `/wod`
- `/comunidad`
- `/login`
- `/planes`
- `/prueba`

No se detectó overflow horizontal a 360 px. Las capturas están en `artifacts/kupan-2.1-before` y `artifacts/kupan-2.1-after`.

## Validación operativa completada

- Migración `20260811120000_kupan_21_operations.sql`: aplicada en producción.
- `payment-webhook`: desplegado con secretos administrados por Supabase.
- Build, lint y pruebas unitarias: OK.
- E2E no destructivo contra producción: 12 OK y 21 omitidos por requerir cuentas aisladas o mutaciones.
- Rutas `/`, `/login`, `/reservas`, `/wod`, `/comunidad`, `/perfil`, `/admin`, `/coach` y `/ranking`: HTTP 200.
- Manifest y service worker: HTTP 200, modo `standalone`, tres iconos y caché KUPAN 2.1.
- Perfil autenticado: plan, pago, fechas, días y tokens cargados desde Supabase.
- Validación funcional autenticada de alumno, coach y admin: confirmada por el responsable de KUPAN.

## Decisión de release

**GO producción.** KUPAN 2.1 fue publicada en `https://kupan-box-app.vercel.app/` el 11 de agosto de 2026. El punto de retorno anterior permanece etiquetado como `kupan-v1.0.19`.

Riesgo controlado pendiente: antes de aceptar notificaciones de pago automáticas de un proveedor real, validar su firma oficial además del secreto compartido actual. Los pagos manuales y la activación administrativa no dependen de esa integración.
