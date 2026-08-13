# Arquitectura white-label KUPAN / FITTEST

## Resumen ejecutivo

La aplicación conserva KUPAN como instalación predeterminada y agrega FITTEST como una segunda configuración pública. Ambas instalaciones comparten el código, pero deben usar despliegues, dominios, proyectos Supabase, secretos, Auth, Storage y datos completamente separados.

La selección de instalación se hace con `VITE_GYM_ID`; el dominio solo actúa como respaldo. Una configuración desconocida produce un error controlado al iniciar y nunca cae silenciosamente en otra instalación cuando `VITE_GYM_ID` fue definido.

## Arquitectura

```text
Código compartido React/Vite
├── configuración KUPAN (predeterminada)
└── configuración FITTEST

KUPAN                         FITTEST
├── despliegue propio         ├── despliegue propio
├── dominio propio            ├── fittest.cl
├── proyecto Supabase propio  ├── proyecto Supabase propio
└── secretos propios          └── secretos propios
```

No se implementó multi-tenancy en tablas compartidas. La base actual no demuestra un `tenant_id` consistente en todas las tablas, RLS y Storage, por lo que compartir datos introduciría riesgo de acceso cruzado.

## Inventario de valores KUPAN encontrados

| Clasificación | Hallazgos principales | Tratamiento |
| --- | --- | --- |
| Branding | Nombre KUPAN, logos, isotipo, paleta, textos de encabezado, carga y navegación | Centralizados progresivamente; KUPAN mantiene sus valores anteriores |
| Contacto | WhatsApp de KUPAN, email de pagos y datos de transferencia | Configuración KUPAN; no se reutilizan en FITTEST |
| Operación | 15 min para reservar, 45 min para cancelar, cupo 12, planes y precios | Configuración por gimnasio |
| Funcionalidad | Reservas, WOD, comunidad, alumnos, coaches, pagos, asistencia y notificaciones | Feature flags públicos; las rutas inactivas redirigen al inicio |
| Infraestructura | Supabase por variables, Vercel/Netlify, manifest, service worker y caches `kupan-*` | Selección por despliegue; caches nuevos aislados por host |
| Seguridad | RLS, Auth, Edge Functions, service role solo servidor, flujos admin | Sin cambios en esta fase |
| Exclusivo KUPAN | Datos bancarios, enlaces Mercado Pago, claves históricas de localStorage y contenido productivo | Permanecen en KUPAN; las claves locales no se renombran para evitar pérdida |

## Configuración FITTEST incorporada

- Identidad: FITTEST / FITTEST SPA, slogan `CrossFit & Hyrox`.
- Marca: fondo `#000000`, texto `#FFFFFF`, bordes y acento `#E31B23`.
- Contacto: dirección, Peñaflor, teléfono/WhatsApp, email, Instagram y dominio de la ficha.
- Clases: Open Box, Hyrox y entrenamiento personalizado, con duraciones de 120, 60 y 90 minutos.
- Cupo máximo predeterminado: 15 alumnos por clase.
- Reserva y cancelación: 30 minutos antes de la clase.
- Planes: $30.000, $40.000 y $50.000, con las frecuencias informadas.
- Funciones activas: reservas, comunidad, asistencia y notificaciones para noticias y recordatorios de renovación.
- Funciones inactivas: WOD, gestión de alumnos, gestión de coaches y pagos online.

Por confirmación posterior del cliente, se activan las notificaciones solicitadas en las observaciones de la ficha, incluidos recordatorios de renovación y noticias del centro.

## Notificaciones KUPAN y FITTEST

- La campana está habilitada para usuarios autenticados en ambas instalaciones y actualiza el contador al volver a la app o cada 60 segundos mientras la sesión permanece abierta.
- Cuando faltan 3 días o menos para el vencimiento de una membresía activa y pagada, la app genera un recordatorio único para ese periodo.
- Al publicar como activa una entrada de tipo `noticia`, se crea un aviso de “Noticias del centro” para cada perfil activo.
- Los avisos usan claves de deduplicación: volver a abrir la app, editar o reactivar la misma noticia no genera copias.
- La automatización está versionada en `supabase/migrations/20260813120000_notification_automation.sql` y debe validarse primero en staging de cada instalación.

## Variables de entorno

Solo nombres y finalidad:

| Variable | Finalidad | Pública en cliente |
| --- | --- | --- |
| `VITE_GYM_ID` | Selecciona `kupan` o `fittest` | Sí |
| `VITE_SUPABASE_GYM_ID` | Vincula explícitamente las credenciales Supabase con el mismo gimnasio y bloquea mezclas accidentales | Sí |
| `VITE_APP_URL` | URL canónica del despliegue | Sí |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase exclusivo de la instalación | Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública del mismo proyecto | Sí |
| `SUPABASE_URL` | URL para scripts/funciones de servidor | No |
| `SUPABASE_ANON_KEY` | Clave anónima para herramientas de servidor cuando corresponda | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones administrativas de servidor | No; nunca en `VITE_*` |

Las variables E2E existentes se usan solo en staging. No deben apuntar a producción.

## Alta de una instalación

1. Duplicar la entrada de configuración en `src/config/gyms.js` con un ID estable.
2. Añadir logos públicos y un manifest propio bajo `public/`.
3. Crear un proyecto Supabase independiente; no copiar usuarios ni datos de otro gimnasio salvo migración aprobada.
4. Aplicar el esquema validado en staging y revisar todas las políticas RLS.
5. Crear un despliegue independiente con `VITE_GYM_ID`, `VITE_SUPABASE_GYM_ID`, `VITE_APP_URL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` correspondientes. Ambos identificadores deben coincidir.
6. Configurar dominio, URLs permitidas de Auth, remitente y redirecciones del gimnasio.
7. Invitar al administrador por email mediante Supabase Auth Admin desde un entorno servidor. El usuario define su contraseña con enlace seguro; no solicitar, enviar ni almacenar una contraseña temporal.
8. Asignar el rol admin exclusivamente desde servidor y verificar que el cliente no pueda modificarlo.
9. Crear coaches por invitación siguiendo el mismo proceso.
10. Cargar horarios, cupos y planes solo en la base de ese gimnasio.

## Protección y recuperación de KUPAN

Antes de cualquier despliegue productivo, verificar y registrar:

- snapshot/backup restaurable de PostgreSQL y prueba de restauración;
- exportación o estrategia documentada para Auth users;
- inventario y copia de todos los buckets y objetos de Storage;
- exportación de esquema, políticas RLS, funciones, triggers y migraciones;
- listado de Edge Functions con su versión;
- nombres de secretos y variables, sin copiar sus valores al repositorio;
- tag o commit estable anterior al white-label;
- staging aislado y prueba completa antes de producción.

Este trabajo no creó ni verificó backups remotos porque no se modificó producción y no se accedió a Supabase productivo. No debe afirmarse que existe un respaldo hasta comprobar restauración.

## Plan de despliegue y reversión

1. Desarrollo: ejecutar pruebas y builds de KUPAN y FITTEST.
2. Staging FITTEST: proyecto Supabase nuevo, datos sintéticos, dominio temporal y pruebas de roles/RLS.
3. Validación: revisar branding, rutas, invitaciones, reservas, asistencia, aislamiento, PWA, responsive y accesibilidad.
4. Producción FITTEST: conectar `fittest.cl` solo después de aprobar staging y DNS.
5. KUPAN: desplegar por separado con `VITE_GYM_ID=kupan`; comparar smoke tests con la versión estable.
6. Reversión: restaurar el despliegue anterior por proveedor y el tag estable. Las bases separadas evitan que revertir FITTEST altere KUPAN.

## Riesgos y decisiones pendientes

- Confirmar disponibilidad y propiedad de `fittest.cl`.
- Obtener logo fuente SVG/PNG oficial; el activo actual deriva de la captura entregada.
- Definir remitente de correo y validar dominio de email.
- Crear y validar el proyecto Supabase FITTEST antes de habilitar datos reales.
- Los feature flags del cliente eliminan navegación y acciones visibles, pero la seguridad definitiva depende de desplegar un Supabase aislado y validar RLS/roles en staging.

## Evidencia de verificación local

- `npm test`: aprobado, incluidas pruebas de configuración e aislamiento Supabase.
- Pruebas de notificaciones: tipos, seguridad por usuario, perfiles activos y deduplicación aprobados.
- `npm run check`: lint y build KUPAN aprobados.
- `VITE_GYM_ID=fittest npm run build`: build FITTEST aprobado.
- `E2E_ALLOW_MUTATIONS=false npm run test:e2e`: 13 pruebas aprobadas, 21 omitidas por requerir credenciales/staging, 0 fallas.
- Revisión manual FITTEST a 390 x 844: inicio, reservas, comunidad, planes, primera clase, login y perfil sin texto KUPAN, sin desbordamiento y con navegación limitada por feature flags.
- Revisión visual: fondo negro, texto blanco, bordes/acento rojo `#E31B23` y logo FITTEST correcto.
- Al ejecutar FITTEST con credenciales locales no vinculadas, la aplicación bloqueó Supabase y no mostró datos KUPAN.

## Staging de notificaciones KUPAN

- Proyecto aislado creado en una organización Supabase Free independiente, región `sa-east-1` (São Paulo), sin datos copiados desde producción.
- Se aplicó una base mínima descartable y la migración `20260813120000_notification_automation.sql`.
- La validación transaccional terminó con `NOTIFICATION_AUTOMATION_OK`: dos destinatarios de noticia, un recordatorio de renovación y cero duplicados; los datos sintéticos fueron revertidos.
- La comprobación de producción fue solo de lectura: las cuatro tablas y columnas requeridas existen y `dedupe_key` todavía no está aplicado.
- Supabase no reportó un punto de restauración productivo utilizable. Se añadió un rollback no destructivo que desactiva las automatizaciones sin borrar notificaciones.

## Publicación KUPAN 2026-08-13

- Se ejecutó un preflight transaccional con `rollback` sobre el proyecto KUPAN vinculado antes de aplicar la migración.
- La migración productiva fue atómica y las seis verificaciones estructurales resultaron verdaderas: columna e índice de deduplicación, funciones de renovación y noticias, trigger activo y tipo `news` permitido.
- El frontend validado fue promovido en el proyecto Vercel `kupan-box-app`; `https://kupan-box-app.vercel.app` sirve el manifest KUPAN actualizado y las rutas `/`, `/login`, `/comunidad` y `/reservas` respondieron HTTP 200.
- El bundle productivo contiene `refresh_my_membership_notifications`, `membershipRenewalReminderDays` y la etiqueta `Noticias del centro`.
- Reversión de base: `supabase/rollbacks/20260813120000_notification_automation_rollback.sql`. Reversión de frontend: despliegue productivo anterior `kupan-box-5vgys3ng2-kupan-s-projects.vercel.app`.

## Checklist KUPAN no afectado

- [x] KUPAN sigue siendo el valor predeterminado.
- [x] Logo, colores, textos, WhatsApp, pagos y reglas KUPAN permanecen configurados.
- [x] No se tocaron datos remotos, Auth, Storage ni secretos de producción.
- [x] Los cambios de RLS, funciones y triggers de notificaciones quedaron versionados para aplicar primero en staging.
- [x] Se conservan las claves locales históricas para evitar pérdida de datos del navegador.
- [x] Las rutas actuales continúan declaradas.
- [x] FITTEST usa activos y configuración propios.
- [x] Los builds de ambas instalaciones terminan correctamente.
- [ ] Validación autenticada y RLS en staging FITTEST (requiere infraestructura nueva).
- [ ] Backup y prueba de restauración de KUPAN (requiere acceso y autorización de infraestructura).
