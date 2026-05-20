# Assets de marca KUPAN

Esta carpeta guarda los elementos visuales reales de KUPAN.

No hay logos inventados en el proyecto. Cuando tengas los archivos finales, déjalos en las carpetas indicadas abajo.

## Dónde Poner Cada Archivo

### Logo principal

Usa esta carpeta:

```text
src/assets/brand/logos/
```

Nombre recomendado:

```text
logo-principal.svg
```

Alternativas aceptadas:

```text
logo-principal.png
logo-principal.webp
```

Úsalo para encabezados, pantallas principales y piezas donde deba verse el nombre KUPAN completo.

### Logo isotipo

Usa esta carpeta:

```text
src/assets/brand/logos/
```

Nombre recomendado:

```text
isotipo.svg
```

Alternativas aceptadas:

```text
isotipo.png
isotipo.webp
```

Úsalo para iconos, avatar de marca, splash visual o espacios pequeños.

### Paleta de colores

Usa esta carpeta:

```text
src/assets/brand/colors/
```

Archivo preparado:

```text
palette.js
```

Ahí puedes ajustar los colores oficiales cuando los tengas definidos.

### Imágenes reales del box

Usa esta carpeta:

```text
src/assets/brand/images/box/
```

Nombres recomendados:

```text
box-entrenamiento-01.webp
box-comunidad-01.webp
box-coaches-01.webp
box-equipamiento-01.webp
```

Prioriza `.webp` para web. También sirven `.jpg` o `.png`.

### Fondos deportivos

Usa esta carpeta:

```text
src/assets/brand/images/backgrounds/
```

Nombres recomendados:

```text
fondo-hero.webp
fondo-wod.webp
fondo-comunidad.webp
textura-metal.webp
```

Estos fondos pueden usarse en hero, pantallas de WOD, comunidad o secciones premium.

## Cómo Usar Un Asset En React

Ejemplo con logo principal:

```jsx
import logoPrincipal from '../assets/brand/logos/logo-principal.svg'

export function HeaderLogo() {
  return <img src={logoPrincipal} alt="KUPAN" />
}
```

La ruta exacta depende del archivo donde hagas el import.

## Recomendaciones

- Logo principal: idealmente `.svg`.
- Isotipo: idealmente `.svg`.
- Fotos: idealmente `.webp`, mínimo 1200 px de ancho si serán hero o fondos.
- Evita nombres con espacios. Usa guiones, por ejemplo `box-entrenamiento-01.webp`.
- Mantén archivos pesados fuera del repo si superan varios MB.
