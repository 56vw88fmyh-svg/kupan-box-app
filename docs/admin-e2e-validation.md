# Validación E2E Admin KUPAN

Fecha: 2026-07-01

## Entorno

- Base local: `http://127.0.0.1:5177`
- Navegador: Chromium Playwright.
- Servidor: Vite iniciado por Playwright.
- Workers: 1.
- Mutaciones reales: no ejecutadas.
- Credenciales usadas: ninguna. No se configuraron cuentas `E2E_*`.

## Commit

Commit base validado: `ad7b080`.

## Configuración

- Archivo: `playwright.config.js`
- Reporte HTML: `playwright-report/`
- Resultados: `test-results/e2e/`
- Screenshots: solo ante fallo, más screenshots responsive cuando se ejecuten pruebas admin con credenciales.
- Trace: primer reintento.
- Video: ante fallo.

## Resultado

Comando ejecutado:

`npm run test:e2e`

Resultado:

- Código de salida: 0.
- Tests totales: 25.
- Aprobados: 10.
- Fallidos: 0.
- Omitidos: 15.
- Duración Playwright reportada: 8.3 s.
- Duración total con `/usr/bin/time`: 9.00 s.

## Tests aprobados

- Accesibilidad básica en login.
- `/admin` sin sesión redirige a login.
- `/coach` sin sesión redirige a login.
- Rutas `/`, `/login`, `/admin`, `/coach`, `/reservas`, `/wod` cargan sin pantalla blanca.
- PWA registra service worker y no usa nombres de cache privados.

## Tests omitidos

Omitidos por falta de credenciales `E2E_*`:

- Alumno no accede a `/admin`.
- Admin accede a `/admin`.
- Coach accede a `/coach`.
- Formularios admin.
- Navegación admin.
- Responsive admin en 360, 390, 430, 768 y 1366 px.
- Borrador WOD browser real.

Omitidos por falta de staging seguro:

- Mutaciones críticas.
- Errores parciales controlados.
- Sesión vencida durante mutación.

## Consola

Se instaló `consoleGuard` para capturar:

- `console.error`
- `console.warning`
- `pageerror`
- `requestfailed`

La ejecución final no reportó errores inesperados.

## PWA

Validado:

- `navigator.serviceWorker.ready`.
- Scope disponible.
- Cache keys no contienen nombres privados como `profiles`, `reservations`, `memberships` o `admin`.

No validado:

- Instalación real.
- Banner de actualización por nueva versión.
- Dispositivo físico.

## Mutaciones reales

No se ejecutaron. `E2E_ALLOW_MUTATIONS` no está habilitado y no se confirmó staging seguro con cleanup.

## Evidencia

Playwright generó reporte HTML en `playwright-report/`.

No quedaron screenshots de fallo en la corrida final porque no hubo fallos.

## Limitaciones

- No se aprobaron flujos autenticados.
- No se aprobaron mutaciones críticas.
- No se aprobaron viewports admin por falta de usuario admin.
- No se aprobaron dispositivos físicos.

## Clasificación resultante

Apto para preview con E2E no destructivo básico aprobado. No apto para producción final hasta completar staging real y validación física.

## Actualizacion validacion autenticada 2026-07-01

| Tipo | Estado | Evidencia |
| --- | --- | --- |
| Prueba publica | APROBADO AUTOMÁTICAMENTE | 10 passed, 0 failed |
| Prueba autenticada | PENDIENTE | Falta `.env.e2e` y cuentas E2E |
| Mutacion | PENDIENTE | `E2E_ALLOW_MUTATIONS` debe permanecer false |
| Dispositivo fisico | PENDIENTE | No ejecutado por Codex |
| Backend staging | PENDIENTE | Project Ref staging no confirmado |
| Cleanup | PENDIENTE | Cleanup destructivo no disponible para recursos criticos |

Resultado: STAGING BLOQUEADO POR CONFIGURACION.
