# Design System KUPAN 2.1

## Concepto

KUPAN expresa **Fuerza · Raíces · Espíritu** con una interfaz deportiva, sobria y comunitaria. Los tokens viven en `src/styles.css`, `tailwind.config.js` y `src/assets/brand/colors/palette.js`.

## Paleta oficial

| Color | Valor | Uso |
| --- | --- | --- |
| Carbón | `#0E1011` | Fondo principal. |
| Marfil | `#EBECE7` | Texto principal y texto de CTA. |
| Rojo raíz | `#9B2A31` | CTA, navegación activa y acciones principales. |
| Verde bosque | `#364B35` | Superficies positivas sobrias. |
| Verde hoja | `#6D8A69` | Progreso y confirmación de marca. |
| Tierra | `#946A5A` | Acentos secundarios. |
| Arena | `#D9CAB3` | Etiquetas y metadatos sobre carbón. |
| Acero | `#BDC3C3` | Bordes y texto secundario con opacidad. |

Marfil sobre carbón y marfil sobre rojo raíz son las combinaciones principales. Rojo raíz no se usa como texto pequeño sobre carbón. Los estados funcionales mantienen colores independientes y siempre incluyen texto o icono.

## Tipografía

- **Barlow Condensed:** títulos, horarios y números deportivos.
- **Inter:** controles, formularios y lectura.
- **Cormorant Garamond:** frases ceremoniales y manifiestos.

No usar Cormorant en datos operativos. Inputs móviles usan al menos 16 px. El texto principal no debe comprimirse para evitar un desborde.

## Componentes

- `.k-button`: acción primaria en rojo raíz con texto marfil.
- `.k-button-secondary`: acción secundaria sobre superficie oscura.
- `.k-card`: contenido agrupado principal.
- `.k-panel`: herramientas y listas compactas.
- `.k-display`: títulos y cifras con Barlow Condensed.
- `.k-ceremonial`: citas con Cormorant Garamond.

Controles táctiles deben medir al menos 44 × 44 px. El foco de teclado debe permanecer visible. Tarjetas y controles usan radios de hasta 8 px salvo componentes heredados que aún estén en migración.

## Logo

El logo completo se usa una sola vez en encabezados públicos, acceso y splash. El isotipo se reserva para icono PWA, favicon y navegación inferior. Nunca deformar, recortar o recolorear los archivos reales.

## Responsive

- Mantener safe areas superior e inferior.
- Reservar espacio para navegación fija.
- Evitar alturas rígidas basadas solo en `100vh`; preferir `100dvh` con fallback.
- Tablas administrativas deben desplazarse dentro de su contenedor o usar tarjetas móviles.
- Ningún texto, nombre o nivel puede forzar overflow horizontal.

## Checklist

- Contraste WCAG AA en información relevante.
- Estado no depende solo del color.
- Logo legible y no repetido.
- CTA principal cercano a la zona del pulgar.
- Errores claros y recuperables.
- Sin hexadecimales nuevos si existe un token de marca.
