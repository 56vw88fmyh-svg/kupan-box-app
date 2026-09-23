# Panel externo de nómina KUPAN

Página independiente: `/nomina.html#acceso=ENLACE_PRIVADO`. Lee la misma base de datos de la app cada 30 segundos. No requiere ni reutiliza una sesión administrativa. No incluye edición, reservas ni navegación al panel de administración.

## Qué muestra

- Perfiles con `role = student` y `status = active`, incluyendo alumnos cuyo plan haya vencido.
- Nombre, plan, fecha de inicio, término efectivo, saldo de tokens y motivo del semáforo.
- Saldo igual al cálculo existente: `max(classes_total - classes_used, 0)`. Ilimitado se muestra sin saldo numérico.
- Si existen varias membresías, prioriza la activa pagada vigente; luego la próxima pagada; finalmente el historial más reciente. Una renovación futura no reemplaza visualmente el saldo actual.
- Fechas en zona `America/Santiago`, vencimiento inclusivo. El término efectivo toma la primera fecha entre `end_date` y `expires_at`.
- Verde: más de 7 días y más de 2 tokens. Amarillo: hasta 7 días o 1–2 tokens. Rojo: vencido o sin tokens. Gris: sin plan, pausado, cancelado, sin pago confirmado, futuro o datos incompletos. El estado explícito del plan y el pago se revisan antes de aplicar el semáforo de saldo/fecha.

## Activación

1. Aplicar **solo** `supabase/migrations/20260921170000_read_only_student_roster.sql` en el proyecto Supabase de KUPAN, tras comprobar que corresponde al entorno de despliegue. Es una migración aditiva: crea una tabla de accesos y cuatro funciones; no actualiza alumnos, membresías, tokens ni políticas existentes. Requiere las tablas actuales y `public.is_admin()`.
2. Publicar el frontend con las mismas variables públicas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de la app. El build contiene `index.html` y `nomina.html`. Vercel y Netlify cuentan con reglas y cabeceras para el panel.
3. Entrar como administrador activo a **Administración → Alumnos → Panel externo de consulta**. Indicar a quién corresponde el acceso y elegir vigencia (7, 30 o 90 días).
4. Pulsar **Crear enlace privado**. Copiar el enlace que aparece; el secreto se entrega una sola vez. La base guarda únicamente su hash.
5. Abrirlo en una ventana privada y comprobar una muestra de nombres, fechas y tokens contra la app. Para retirar acceso, pulsar **Revocar acceso** en la misma sección administrativa.

El enlace funciona como una llave: cualquier persona que lo reciba puede consultar los datos limitados del panel hasta que venza o se revoque. Compartirlo solo con personas autorizadas. No es una URL pública para difundir.

## Seguridad y sincronización

- El secreto viaja en el fragmento `#acceso=...`, no en la consulta de la URL, y en el cuerpo de la petición de lectura. No se incluye en repositorios, analítica o almacenamiento local.
- La página usa la clave pública anónima, nunca el token de una sesión de administrador. No importa el cliente de autenticación de la app.
- `read_student_roster` valida el hash y la vigencia antes de devolver información. No acepta campos para modificar datos. Los enlaces no autorizan otras funciones de la app.
- La tabla de enlaces tiene RLS, sin acceso directo de `anon` ni `authenticated`. Crear/listar/revocar exige `is_admin()` en el servidor. La función de lectura solo se concede a `anon`; los permisos por defecto se revocan expresamente.
- No devuelve correos, teléfonos, notas, referencias de pago ni hashes. Sí incluye el estado del pago para distinguir planes que no están habilitados.
- La consulta devuelve una sola estructura JSON para evitar truncar silenciosamente la nómina por el límite de filas de la API.
- En caso de error o revocación se eliminan de pantalla los datos previos. Al ocultar la pestaña se ocultan también los datos y se pausan las consultas; al volver se solicita una actualización. Cada consulta tiene un límite de 15 segundos.
- Revocar impide nuevas consultas inmediatamente en el servidor. Una página abierta lo reflejará en su siguiente actualización, normalmente en hasta 30 segundos, más la latencia de la petición. No permite recuperar datos ya vistos o copiados por un receptor.
- No se guardan nombres ni balances en caché offline. El service worker trata la ruta como privada. Los encabezados evitan indexación e inclusión en marcos externos.

## Verificación

```sh
npm run lint
npm test
npm run test:roster
npm run test:e2e -- tests/e2e/roster.spec.js
npm run build
```

La prueba de base usa PostgreSQL local desechable (PGlite), sin consultar o modificar datos reales. Ejecuta la migración y prueba roles, tokens inválidos, vencimiento, revocación, selección entre planes, exclusión de inactivos y entrenadores, más de 1.000 alumnos y ausencia de cambios en las membresías. La prueba de navegador usa respuestas simuladas; sus capturas son una demostración, no la nómina real.

Antes de dar el panel por operativo se debe verificar la migración y el enlace en el entorno publicado con datos reales. Compilar o superar pruebas locales no acredita esa conexión.

## Reversión

Revocar primero los enlaces desde Administración para cortar la consulta. Si se retira por completo el módulo, volver al despliegue anterior del frontend y eliminar mediante una migración revisada las cuatro funciones nuevas y `student_roster_links`. No modificar las tablas de alumnos ni membresías. No ejecutar indiscriminadamente todas las migraciones históricas para instalar este panel.
