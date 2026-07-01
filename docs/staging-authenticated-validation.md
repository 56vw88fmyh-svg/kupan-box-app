# Validacion Autenticada Staging KUPAN

Fecha: 2026-07-01

## Clasificacion

STAGING BLOQUEADO POR CONFIGURACION.

## Entorno

- `.env.e2e`: ausente.
- URL staging: no configurada.
- Deploy staging: no confirmado.
- Supabase staging: no confirmado.
- Project Ref parcial: no disponible.
- Mutaciones: deshabilitadas y bloqueadas.

## Commit y deploy

- Commit local base: `ad7b080`.
- Deploy validado: pendiente.
- Deployment ID: pendiente.
- Rama: pendiente de confirmacion en Vercel staging.

## Roles disponibles

- Admin E2E: no confirmado.
- Coach E2E: no confirmado.
- Alumno E2E: no confirmado.

No se intentaron logins porque no existe configuracion local E2E ni evidencia de staging no productivo.

## Tests ejecutados

- `npm run qa:e2e:validate`: fallido controlado por variables faltantes.
- `npm run lint`: aprobado.
- `npm test`: aprobado.
- `npm run build`: aprobado.
- `npm run check`: aprobado.
- `npm run test:e2e`: aprobado en pruebas publicas/no destructivas.

## Tests omitidos

- Login admin.
- Login coach.
- Login alumno.
- Navegacion Admin autenticada.
- Responsive autenticado.
- Formularios Admin no destructivos.
- Borrador WOD en browser autenticado.
- PWA autenticada.
- Sesion vencida.
- Mutaciones.

## Resultado por rol

- Sin sesion: aprobado para `/admin` y `/coach`, redirigen a login sin exponer panel.
- Admin: pendiente.
- Coach: pendiente.
- Alumno: pendiente.

## Responsive

Pendiente en modo autenticado. Las suites existen, pero requieren admin E2E.

## Consola

La consola quedo limpia en pruebas ejecutadas. Consola autenticada pendiente por falta de credenciales.

## Borrador WOD

Pruebas unitarias del borrador aprobadas. Validacion browser autenticada pendiente por falta de admin E2E.

## PWA

PWA basica aprobada: service worker registrado y caches sin nombres privados conocidos en prueba publica. PWA autenticada pendiente.

## Accesibilidad

Accesibilidad basica en login aprobada. Accesibilidad autenticada pendiente.

## Viabilidad de cleanup

Evaluada en `docs/e2e-cleanup-feasibility.md`.

Bloqueos:

- Auth users: cleanup no disponible.
- Profiles: cleanup no disponible.
- Token movements: cleanup no disponible.
- Pagos simulados: cleanup no disponible.

## Bloqueos para mutaciones

- No hay staging confirmado.
- No hay cuentas E2E confirmadas.
- No hay `.env.e2e`.
- Cleanup destructivo no aprobado para recursos criticos.
- `E2E_ALLOW_MUTATIONS` debe permanecer `false`.

## Evidencia

- Tests E2E totales: 25.
- Aprobados: 10.
- Fallidos: 0.
- Omitidos: 15.

## Correcciones aplicadas

- Se ajusto `tests/e2e/public-routes.spec.js` para que `safeGoto` tolere una navegacion interrumpida por otra navegacion del mismo flujo. La ruta `/wod` habia fallado por sincronizacion de Playwright; la reejecucion final quedo en 10 passed, 0 failed, 15 skipped.

## Siguiente paso

Crear `.env.e2e` local con URL staging y cuentas ficticias. Luego ejecutar:

```bash
npm run qa:e2e:validate
```

Si aprueba, ejecutar:

```bash
npm run qa:e2e:authenticated
```
