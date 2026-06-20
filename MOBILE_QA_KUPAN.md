# Mobile QA KUPAN

Fecha: 2026-06-19  
Foco: PWA instalada, Safari iOS, Android gama media y navegadores móviles.

## Resumen

Se revisaron las rutas principales con referencia a 320x568, 375x667, 390x844, 393x852 y 430x932. La corrección fue transversal para evitar zoom automático en iOS, contenido bajo barras fijas, overflow horizontal, modales cortados y problemas de safe area en PWA instalada.

## Correcciones Aplicadas

| Ruta / zona | Resolución de riesgo | Problema detectado | Corrección |
|---|---:|---|---|
| Todas | 320x568 a 430x932 | Inputs, selects y textareas podían quedar en 14px por clases `text-sm`, provocando zoom automático en Safari iOS. | Se forzó `font-size: 16px` para `input`, `select` y `textarea` en CSS global. |
| Todas | iPhone con notch / Dynamic Island | Safe area lateral no estaba reforzada en header/main/nav. | Se aplicaron `env(safe-area-inset-left/right/top/bottom)` en header, main, barra inferior y modales. |
| Todas | PWA instalada | `#root` y shell podían depender solo de `100svh`. | Se agregó `100dvh` como soporte para altura dinámica de Safari móvil. |
| Todas | 320x568 | Cards y paneles podían empujar ancho en contenidos largos. | Se agregó `min-w-0` a `.k-card` y `.k-panel`. |
| Header app | 320x568 | Eyebrow superior podía aparecer truncado con puntos suspensivos. | Se reemplazó `truncate` por texto con salto controlado y `break-words`. |
| Inicio | 320x568 | Nombre largo del atleta podía cortarse. | Se reemplazó `truncate` por `break-words` en el saludo principal. |
| Reservas | 320x568 / 375x667 | Selector semanal horizontal necesitaba scroll táctil fluido y sin barra invasiva. | Se agregó clase `k-scroll-x` con `-webkit-overflow-scrolling: touch`. |
| Comunidad | 320x568 / 390x844 | Tabs horizontales podían sentirse duros en touch. | Se agregó `k-scroll-x` al contenedor. |
| Coach | 320x568 / 390x844 | Selector de clases horizontal podía mostrar scroll nativo tosco. | Se agregó `k-scroll-x` al contenedor. |
| Admin | 320x568 / 430x932 | Filtros horizontales podían generar scroll incómodo. | Se agregó `k-scroll-x` al contenedor. |
| Admin sidebar | Safari móvil / desktop bajo | Uso de `100vh` podía fallar con barras del navegador. | Se reemplazó por `100dvh` en alturas máximas del sidebar. |
| Modales | 320x568 / orientación horizontal | Modal podía ocupar más alto que la pantalla baja o quedar cerca del Home Indicator. | Se creó `.k-dialog-backdrop` y `.k-dialog-panel` con safe areas, `100dvh` y scroll interno. |
| Barra inferior | iPhone PWA | Riesgo de tap targets cerca del Home Indicator. | Se reforzó padding inferior/lateral con safe area y versión compacta para pantallas pequeñas. |
| Orientación horizontal | Altura menor a 520px | Header sticky podía consumir demasiado espacio vertical. | En landscape bajo, el header pasa a flujo normal y la barra inferior se compacta. |

## Rutas Revisadas

| Ruta | Estado móvil | Notas |
|---|---|---|
| `/` | OK | Hero/inicio mantiene CTA visible y nombre largo ya no se corta de forma agresiva. |
| `/reservas` | OK | Selector semanal táctil, cards con cupos y botones dentro del ancho móvil. |
| `/wod` | OK | Cards y modal de resultado preparados para pantallas bajas. |
| `/comunidad` | OK | Tabs con scroll táctil y cards sin overflow horizontal esperado. |
| `/perfil` | OK | Edición y contraseña colapsadas; formularios protegidos contra zoom iOS. |
| `/mis-pr` | OK | Selects de movimiento/resultado en 16px y modal de historial con scroll interno. |
| `/ranking` | OK | Filtros select protegidos contra zoom iOS. |
| `/login` | OK | Registro/login con inputs 16px y safe area superior. |
| `/coach` | OK | Selector de clases, agregar alumno y acciones de asistencia adaptadas a móvil. |
| `/admin` | OK con nota | Panel administrativo es denso por naturaleza, pero sidebar, filtros, formularios y acciones rápidas quedan navegables en móvil. |

## Riesgos Pendientes

- La revisión visual automatizada completa con Chrome headless no pudo ejecutarse dentro del entorno actual porque el navegador Playwright no está instalado en caché y Chrome del sistema quedó bloqueado para ese flujo. Se hizo revisión estática y corrección preventiva sobre los patrones móviles críticos.
- En Admin, algunos textos extremadamente largos cargados desde Supabase pueden ocupar varias líneas. La app ya evita overflow, pero conviene mantener títulos y notas administrativas razonables.
- Safari iOS real debe probarse después de publicar, especialmente como PWA instalada, porque el comportamiento de barras del navegador y teclado depende del dispositivo.

## Checklist Manual Recomendado

1. Abrir la app en iPhone Safari.
2. Agregar a pantalla de inicio.
3. Entrar como alumno.
4. Probar `/login`, `/perfil`, `/reservas`, `/mis-pr` y `/wod`.
5. Tocar inputs y confirmar que no hay zoom automático.
6. Abrir modales y confirmar que se puede hacer scroll sin cortar botones.
7. Entrar como admin y revisar `/admin` y `/coach`.
8. Rotar el celular a horizontal y volver a vertical.
9. Confirmar que la barra inferior no tapa acciones principales.

