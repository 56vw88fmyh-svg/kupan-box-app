# Arquitectura de Navegacion KUPAN

## Objetivo

Simplificar la navegacion cotidiana del alumno en Kupan Box App a cinco destinos principales, manteniendo rutas antiguas y accesos directos compatibles cuando sea posible.

## Navegacion principal movil

La barra inferior muestra exactamente cinco opciones:

1. Inicio: resumen y accesos rapidos.
2. Reservas: calendario, horarios, clases disponibles, mis reservas e historial de reservas.
3. WOD: WOD de hoy, historial, resultados y PR.
4. Comunidad: actividad, eventos, noticias, ranking y cumpleanos.
5. Perfil: datos personales, mi plan, asistencia, configuracion, ayuda, cerrar sesion y accesos internos por rol.

Archivo principal:

- `src/components/BottomNav.jsx`

Reglas aplicadas:

- Maximo cinco opciones.
- Icono y texto en cada opcion.
- Estado activo visible por fondo, borde, indicador superior y texto, no solo por color.
- Safe area respetada desde `.k-bottom-nav` en `src/styles.css`.
- Contenido protegido por padding inferior en `.k-app-shell`.

## Fuente unica de rutas

Archivo:

- `src/navigation/routes.js`

Exports principales:

- `primaryNavItems`
- `secondaryRoutes`
- `routeAliases`
- `pages`
- `getRouteMeta(pathname)`
- `getActiveNavId(pathname)`
- `getPathForPageId(pageId)`
- `userCanAccessRoute(route, currentUser)`

`src/data/pages.js` se mantiene como capa compatible para imports antiguos.

## Rutas principales

| Seccion | Ruta | Nav activo |
| --- | --- | --- |
| Inicio | `/` | Inicio |
| Reservas | `/reservas` | Reservas |
| WOD | `/wod` | WOD |
| Comunidad | `/comunidad` | Comunidad |
| Perfil | `/perfil` | Perfil |

## Rutas secundarias conservadas

| Ruta | Funcion | Nav activo |
| --- | --- | --- |
| `/mis-pr` | PR personales | WOD |
| `/wod/pr` | Alias semantico de PR | WOD |
| `/ranking` | Ranking | Comunidad |
| `/comunidad/ranking` | Alias semantico de ranking | Comunidad |
| `/login` | Acceso | Perfil |
| `/coach` | Modo coach | Perfil |
| `/admin` | Panel admin | Perfil |
| `/planes` | Compatibilidad antigua | Redirige a Perfil |

## Aliases y redirecciones

| Ruta antigua / directa | Destino |
| --- | --- |
| `/horarios` | `/reservas` |
| `/calendario` | `/reservas` |
| `/mis-reservas` | `/reservas` |
| `/historial-reservas` | `/reservas` |
| `/wod-hoy` | `/wod` |
| `/resultados` | `/wod` |
| `/actividad` | `/comunidad` |
| `/eventos` | `/comunidad` |
| `/noticias` | `/comunidad` |
| `/cumpleanos` | `/comunidad` |
| `/configuracion` | `/perfil` |
| `/ayuda` | `/perfil` |

Estas rutas usan `Navigate replace`, por lo que no agregan pasos innecesarios al historial del navegador.

## Roles

| Ruta | Roles permitidos |
| --- | --- |
| `/admin` | `admin` |
| `/coach` | `admin`, `coach` |

Si un alumno o usuario no autenticado intenta entrar directo a una ruta restringida, la app lo devuelve a `/perfil` con `replace` despues de confirmar el estado de autenticacion. Esto evita mostrar accesos administrativos al alumno y evita rebotes prematuros mientras Supabase carga la sesion.

## Compatibilidad con enlaces antiguos

Se mantienen rutas y aliases para evitar romper:

- Accesos directos guardados.
- Shortcuts PWA.
- Navegacion programatica existente con `setActivePage`.
- Links internos antiguos como `/mis-pr` y `/ranking`.

`setActivePage('prs')` sigue resolviendo a `/mis-pr`.
`setActivePage('ranking')` sigue resolviendo a `/ranking`.

## Boton atras en movil

La navegacion principal usa rutas reales de React Router. Los aliases usan `replace`, por lo que entrar a `/horarios` no deja un paso fantasma antes de `/reservas`. En navegacion normal dentro de la app, el boton atras vuelve a la pantalla anterior en vez de duplicar redirecciones.

No se intercepta globalmente el boton atras del navegador porque eso rompe expectativas de Safari iOS y PWA instalada. La estrategia segura es evitar redirecciones acumuladas y mantener rutas canonicas claras.

## Pruebas de rutas

Archivo:

- `src/navigation/routes.test.js`

Valida:

- La navegacion principal tiene exactamente cinco items.
- El orden es Inicio, Reservas, WOD, Comunidad, Perfil.
- Rutas secundarias activan el item padre correcto.
- Aliases apuntan a rutas conocidas.
- `/admin` y `/coach` respetan roles.

El script `npm test` ejecuta estas pruebas junto a las pruebas existentes de PR.

## Migracion futura recomendada

1. Agregar tabs internas en Reservas si se necesita separar Calendario, Mis reservas e Historial visualmente.
2. Agregar tabs internas en WOD para WOD de hoy, Resultados y PR.
3. Mover ranking dedicado dentro de Comunidad con acceso secundario visible.
4. Mantener Admin como area independiente con menu lateral propio.
5. Evitar agregar nuevos items al bottom nav; todo nuevo modulo debe vivir dentro de una de las cinco secciones.
