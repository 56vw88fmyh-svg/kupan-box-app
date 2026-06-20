# Design System KUPAN

## Objetivo

Mantener la identidad oscura y roja de Kupan Box App con mejor legibilidad en celular, contraste consistente y reglas claras para no usar rojo como texto habitual.

## Tokens globales

Los tokens viven en:

- `src/styles.css`: variables CSS globales.
- `tailwind.config.js`: alias Tailwind compatibles con opacidad.
- `src/assets/brand/colors/palette.js`: paleta exportable para uso JS.

### Fondos

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg-primary` | `#0B0B0C` | Fondo principal de app. |
| `--bg-secondary` | `#141416` | Header, fondo secundario. |
| `--bg-card` | `#1B1B1E` | Tarjetas y bloques. |
| `--bg-elevated` | `#232327` | Modales, popovers, paneles elevados. |

### Texto

| Token | Valor | Uso |
| --- | --- | --- |
| `--text-primary` | `#F5F5F5` | Titulos y texto principal. |
| `--text-secondary` | `#C7C7CC` | Parrafos, descripciones y metadatos importantes. |
| `--text-muted` | `#92929A` | Etiquetas secundarias. |
| `--text-disabled` | `#68686F` | Estados inactivos. No usar para informacion importante. |

### Marca y estados

| Token | Valor | Uso |
| --- | --- | --- |
| `--brand-red` | `#F04444` | CTA primario, activo, marca y alertas puntuales. |
| `--brand-red-hover` | `#FF5C5C` | Hover, foco y enfasis puntual. |
| `--brand-red-soft` | `rgba(240, 68, 68, 0.14)` | Fondo suave de marca o alerta. |
| `--success` | `#3CCB7F` | Exito, asistencia, sincronizacion correcta. |
| `--warning` | `#F5B942` | Advertencia. |
| `--error` | `#FF5A5F` | Error, cancelacion o accion destructiva. |
| `--info` | `#5CA8FF` | Informacion contextual. |

### Bordes

| Token | Valor | Uso |
| --- | --- | --- |
| `--border-default` | `#303036` | Bordes sutiles. |
| `--border-strong` | `#45454D` | Bordes activos o destacados. |

## Contraste WCAG AA

Combinaciones verificadas sobre fondo principal `#0B0B0C` y tarjeta `#1B1B1E`:

| Color | Fondo principal | Tarjeta | Estado |
| --- | ---: | ---: | --- |
| `--text-primary` | 18.05:1 | 15.76:1 | Cumple AA. |
| `--text-secondary` | 11.68:1 | 10.20:1 | Cumple AA. |
| `--text-muted` | 6.37:1 | 5.56:1 | Cumple AA. |
| `--brand-red` | 5.26:1 | 4.59:1 | Cumple AA como texto sobre oscuro. |
| `--brand-red-hover` | 6.50:1 | 5.68:1 | Cumple AA como texto sobre oscuro. |
| `--success` | 9.41:1 | 8.22:1 | Cumple AA. |
| `--warning` | 11.15:1 | 9.74:1 | Cumple AA. |
| `--error` | 6.45:1 | 5.63:1 | Cumple AA. |
| `--info` | 7.96:1 | 6.96:1 | Cumple AA. |

Nota: rojo vivo con texto blanco no cumple AA para textos pequeños. Para botones rojos se debe usar texto oscuro o aumentar mucho el tamano/peso. El componente `.k-button` usa texto oscuro por contraste.

## Tipografia

Familia: Inter, system-ui, sans-serif.

Escala recomendada:

- 12 px: etiquetas muy secundarias.
- 14 px: metadatos.
- 16 px: texto base y contenido principal.
- 18 px: titulos de tarjetas.
- 22 px: subtitulos importantes.
- 28 px: titulo de pantalla.

Reglas:

- No usar texto principal menor a 16 px.
- No usar peso 300 sobre fondo oscuro.
- Evitar parrafos completos en mayusculas.
- Interlineado minimo 1.4 para parrafos.
- Usar maximo tres pesos: 600, 700 y 900.

## Espaciado

Escala base:

- 4 px: `--space-1`
- 8 px: `--space-2`
- 12 px: `--space-3`
- 16 px: `--space-4`
- 24 px: `--space-6`
- 32 px: `--space-8`
- 40 px: `--space-10`
- 48 px: `--space-12`

## Radios

- 8 px: controles pequenos.
- 12 px: botones y tarjetas compactas.
- 16 px: tarjetas principales.
- 22 px: contenedores destacados.

## Uso correcto

```jsx
<p className="text-base leading-6 text-kupan-bone">Texto principal legible.</p>
<p className="text-sm leading-5 text-white/70">Metadata secundaria.</p>
<button className="k-button">Reservar clase</button>
<div className="k-card p-4">Contenido en tarjeta.</div>
```

## Uso incorrecto

```jsx
<p className="text-kupan-red">Descripcion completa en rojo.</p>
<p className="text-xs font-light text-white/40">Texto importante demasiado debil.</p>
<div className="bg-black text-red-700">Bajo contraste en celular.</div>
```

## Reglas de rojo

Usar rojo para:

- CTA primario.
- Estado activo.
- Marca puntual.
- Alertas.
- Error.
- Cancelacion.

No usar rojo para:

- Parrafos largos.
- Fechas normales.
- Descripciones.
- Navegacion inactiva.
- Metadatos repetitivos.

## Checklist para nuevas pantallas

- El texto principal usa `text-kupan-bone` o `text-white` con opacidad suficiente.
- El texto secundario no baja de `text-white/60` o `--text-muted` si es contenido real.
- El rojo no se usa como color por defecto de metadata.
- Los botones primarios tienen contraste texto/fondo AA.
- Las tarjetas usan `k-card` o `k-panel`.
- Los estados de foco son visibles con teclado.
- No se agregan colores hex hardcodeados si existe token.

## Rollback

Restaurar desde Git:

- `src/styles.css`
- `tailwind.config.js`
- `src/assets/brand/colors/palette.js`
- `DESIGN_SYSTEM_KUPAN.md`

No hay cambios en datos, rutas ni Supabase.
