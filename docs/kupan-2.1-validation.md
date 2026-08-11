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

## Pendiente obligatorio en staging

1. Aplicar `20260811120000_kupan_21_operations.sql`.
2. Probar alumno, coach y admin con cuentas aisladas.
3. Activar un plan y confirmar sincronización de Perfil.
4. Probar reserva, cancelación a 46/45/44 minutos y no-show.
5. Simular concurrencia por último cupo y promoción de lista de espera.
6. Desplegar `payment-webhook` solo con secretos de staging.
7. Ejecutar `npm run qa:e2e:authenticated`.

## Decisión de release

Frontend listo para preview. Producción queda bloqueada hasta que la migración y las pruebas autenticadas pasen en staging. No se ejecutó SQL ni se desplegó código en producción durante esta tarea.
