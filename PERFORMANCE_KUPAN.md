# Performance KUPAN

Fecha: 2026-06-19  
Objetivo: optimizar carga inicial, bundle, PWA y estabilidad sin cambiar comportamiento funcional ni identidad visual.

## Bundle Antes

Medición base con `npm run build` antes de los cambios de rendimiento:

| Métrica | Antes |
|---|---:|
| Chunk principal JS | `618.84 kB` |
| Chunk principal gzip | `186.18 kB` |
| CSS principal | `37.97 kB` |
| Admin lazy chunk | `64.39 kB` |
| Profile lazy chunk | `25.59 kB` |
| PR lazy chunk | `28.05 kB` |
| Warning Vite chunk > 500 kB | Sí |
| Precache PWA aproximado | ~`2 MB` en logo/iconos públicos |

Hallazgo principal: el shell inicial importaba Framer Motion y el código común quedaba dentro de un único chunk grande. El panel admin ya estaba lazy, pero la carga inicial todavía era demasiado pesada.

## Bundle Después

Medición final con `npm run build`:

| Métrica | Después |
|---|---:|
| Chunk principal JS | `47.49 kB` |
| Chunk principal gzip | `15.44 kB` |
| Vendor React | `227.43 kB` / `72.33 kB gzip` |
| Vendor Supabase | `204.03 kB` / `52.94 kB gzip` |
| Vendor Motion | `28.76 kB` / `9.78 kB gzip` |
| Admin lazy chunk | `64.50 kB` / `15.38 kB gzip` |
| Profile lazy chunk | `25.74 kB` / `6.86 kB gzip` |
| CSS principal | `39.14 kB` / `7.45 kB gzip` |
| JS total on disk | ~`860 kB` |
| Warning Vite chunk > 500 kB | No |
| Precache PWA aproximado | ~`88 kB` inicial |

Resultado clave: el chunk principal bajó de `618.84 kB` a `47.49 kB`, una reducción aproximada de `92%` en el archivo de entrada. Las dependencias grandes quedaron separadas en chunks cacheables.

## Cambios Aplicados

- Se sacó `framer-motion` del shell inicial de la app.
- `MotionPage`, `MotionCard`, `BottomNav` y `LoadingScreen` ahora usan CSS liviano para animaciones base.
- Framer Motion queda disponible solo donde todavía se usa de forma lazy, principalmente Perfil.
- Se agregaron `manualChunks` en Vite:
  - `vendor-react`
  - `vendor-supabase`
  - `vendor-motion`
  - `vendor`
- El panel Admin se mantiene lazy y separado.
- Las rutas principales siguen lazy loaded.
- Se definieron `width`, `height` y `decoding="async"` en imágenes críticas para reducir layout shifts.
- Imágenes de noticias mantienen `loading="lazy"`.
- Se redujo el `APP_SHELL` del Service Worker para no precargar logos/iconos grandes durante instalación.
- Se actualizó caché PWA a `v13`.
- Se actualizó versión visible a `KUPAN App v1.0.9`.
- Se revisaron timers/listeners principales:
  - `onAuthStateChange` tiene unsubscribe.
  - Listeners online/offline tienen cleanup.
  - Service worker update interval tiene cleanup.
  - Dialog keydown listener tiene cleanup.

## Dependencias

Revisión con `npm ls`:

- `react` deduplicado.
- `react-dom` deduplicado.
- `framer-motion` usa el mismo React.
- `@supabase/supabase-js` único.

No se detectaron dependencias duplicadas críticas.

## Service Worker y Caché

Antes, el `install` cacheaba:

- logo público grande
- isotipo público grande
- iconos 192/512/maskable
- manifest

Después, el precache inicial queda reducido a:

- `manifest.webmanifest`
- `icon-192.png`

Los assets grandes siguen disponibles y se cachean bajo demanda cuando el navegador los solicita. Esto acelera instalación y reduce descarga inicial en Android/iPhone.

## Riesgos

- React, Supabase y sus dependencias siguen siendo grandes porque son necesarios para sesión, rutas y datos reales.
- El total de JS no bajó tanto como el entry chunk, porque ahora está mejor dividido y cacheable.
- No se convirtieron logos a WebP/AVIF automáticamente para evitar romper manifest, PWA o logos reales. Sigue pendiente una optimización de imagen controlada.
- Algunos assets públicos siguen pesados en `public/brand` e `icons`, aunque ya no se precargan todos.
- Admin es funcionalmente denso; está lazy, pero si se abre cargará su chunk completo.

## Mejoras Pendientes

- Crear versiones WebP/AVIF de logos con fallback PNG cuando se confirme compatibilidad visual.
- Revisar si `@supabase/supabase-js` puede inicializarse bajo demanda sin afectar sesión persistente.
- Paginar listados admin si el box supera cientos de alumnos/reservas.
- Agregar paginación o límite visible a movimientos de tokens y PR destacados en Admin.
- Medir con Lighthouse en dispositivo real/PWA instalada.
- Considerar `vite build --report` o visualizer si se permite agregar herramienta de análisis.

## Comandos Ejecutados

```bash
npm ls react react-dom framer-motion @supabase/supabase-js
npm run build
npm run check
npm test
```

## Resultado de Validación

- `npm run build` OK.
- `npm run check` OK.
- `npm test` OK.
- Sin warning de Vite por chunks mayores a 500 kB.

