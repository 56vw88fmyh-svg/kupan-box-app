# Componentes UI KUPAN

## Objetivo

Estandarizar los controles visuales de Kupan Box App sobre el sistema visual global ya definido en `DESIGN_SYSTEM_KUPAN.md`, reduciendo inconsistencias de color, altura, estados y accesibilidad sin cambiar la logica de negocio.

## Ubicacion

Los componentes viven en:

`src/components/ui/`

Export principal:

```js
import { Badge, Button, Card, Dialog, EmptyState, ErrorState, Input, LoadingState, ToastProvider, useToast } from './components/ui/index.js'
```

## Button

Archivo: `src/components/ui/Button.jsx`

Variantes:

- `primary`: accion principal. Usa rojo KUPAN con texto oscuro para contraste AA.
- `secondary`: accion alternativa.
- `tertiary`: accion de bajo peso visual.
- `destructive`: cancelacion o eliminacion.
- `success`: confirmacion o accion positiva.
- `icon`: botones compactos con area tactil minima.

Tamanos:

- `sm`: minimo 44 px de alto.
- `md`: minimo 48 px de alto.
- `lg`: minimo 56 px de alto.

Estados:

- Hover.
- Active.
- Focus visible.
- Disabled.
- Loading con `isLoading`.

Uso:

```jsx
<Button onClick={handleSave}>Guardar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="destructive">Eliminar</Button>
<Button isLoading loadingLabel="Guardando">Guardar</Button>
<Button variant="icon" aria-label="Cerrar">x</Button>
```

Reglas:

- No usar rojo como texto normal.
- No depender solo del color: siempre usar texto claro de accion.
- En loading, el contenido queda reservado para evitar salto brusco de ancho.

## Card

Archivo: `src/components/ui/Card.jsx`

Variantes:

- `standard`: tarjeta base.
- `elevated`: modal, popover o elemento flotante.
- `interactive`: tarjeta clickeable.
- `selected`: seleccion actual.
- `warning`: advertencia no destructiva.

Uso:

```jsx
<Card className="p-4">Contenido</Card>
<Card as="article" variant="interactive">Clase</Card>
<Card variant="selected">Reserva activa</Card>
```

Reglas:

- No usar borde rojo en todas las tarjetas.
- Usar `selected` solo para seleccion activa.
- Usar `warning` para avisos o informacion que requiere atencion.

## Badge

Archivo: `src/components/ui/Badge.jsx`

Estados:

- `available`
- `reserved`
- `full`
- `cancelled`
- `pending`
- `success`
- `warning`
- `error`
- `neutral`

Uso:

```jsx
<Badge state="available">8 cupos</Badge>
<Badge state="full">Clase completa</Badge>
<Badge state="cancelled">Cancelada</Badge>
```

## Input

Archivo: `src/components/ui/Input.jsx`

Incluye:

- Label visible.
- Texto de ayuda.
- Error.
- Success.
- Disabled.
- Required.
- Icono opcional.

Uso:

```jsx
<Input label="Correo" type="email" required value={email} onChange={handleEmail} />
<Input label="Telefono" helpText="Opcional, solo para contacto del box." />
<Input label="Nombre" error="Ingresa tu nombre completo." />
<Input label="Codigo" success="Codigo valido." />
```

Regla importante: el placeholder nunca debe ser el unico label.

## Dialog

Archivo: `src/components/ui/Dialog.jsx`

Incluye:

- `role="dialog"`.
- `aria-modal`.
- Titulo descriptivo.
- Escape para cerrar.
- Focus trap.
- Retorno de foco al activador.
- Cierre accesible.
- En acciones destructivas, `isDestructive` evita cerrar por click accidental en backdrop.

Uso:

```jsx
<Dialog isOpen={isOpen} title="Cancelar reserva" description="Esta accion libera tu cupo." isDestructive onClose={closeDialog}>
  <Button variant="destructive">Confirmar cancelacion</Button>
</Dialog>
```

## EmptyState

Archivo: `src/components/ui/States.jsx`

Uso:

```jsx
<EmptyState
  title="Aun no tienes reservas"
  description="Reserva tu primera clase para ordenar tu semana."
  action={<Button>Reservar clase</Button>}
/>
```

## LoadingState

Archivo: `src/components/ui/States.jsx`

Uso:

```jsx
<LoadingState label="Cargando reservas" />
```

Incluye spinner, skeleton y `role="status"`.

## ErrorState

Archivo: `src/components/ui/States.jsx`

Uso:

```jsx
<ErrorState
  title="No pudimos cargar tus reservas"
  description="Revisa tu conexion e intenta nuevamente."
  onAction={reloadReservations}
/>
```

## Toast

Archivo: `src/components/ui/Toast.jsx`

La app esta envuelta con `ToastProvider` desde `src/main.jsx`.

Uso:

```jsx
const { showToast } = useToast()
showToast({ type: 'success', title: 'Reserva confirmada', description: 'Te esperamos en clase.' })
showToast({ type: 'error', title: 'No se pudo guardar', description: 'Intenta nuevamente.' })
```

Tipos:

- `success`
- `warning`
- `error`
- `info`
- `neutral`

## Migracion aplicada

Se migraron componentes de bajo riesgo:

- `src/components/ClassCard.jsx`: usa `Card`, `Badge` y `Button`.
- `src/components/PwaUpdateBanner.jsx`: usa `Card` y `Button`.
- `src/pages/Auth.jsx`: usa `Input` y `Button` en campos/botones principales.
- `src/main.jsx`: agrega `ToastProvider` global.

## Migracion progresiva recomendada

Siguiente orden sugerido:

1. `Profile.jsx`: cards de perfil, empty states y botones secundarios.
2. `Reservations.jsx`: cards de clases, estados full/reserved/cancelled.
3. `PersonalRecords.jsx`: inputs, selector de movimientos, estados empty/error/loading.
4. `Coach.jsx`: botones de asistencia y cancelacion.
5. `Admin.jsx`: migracion por secciones, sin reemplazo masivo.

## Pruebas manuales recomendadas

- Navegar con teclado por login y banner PWA.
- Validar focus visible en botones e inputs.
- Confirmar que botones disabled no ejecutan accion.
- Probar loading en login.
- Probar texto largo en badges y botones.
- Revisar iPhone SE: campos no deben quedar menores a 44 px tactiles.
- Revisar Android: botones y campos deben tener contraste suficiente.

## Rollback

Restaurar desde Git:

- `src/components/ui/`
- `src/components/ClassCard.jsx`
- `src/components/PwaUpdateBanner.jsx`
- `src/pages/Auth.jsx`
- `src/main.jsx`
- `COMPONENTES_UI_KUPAN.md`

No hay cambios en Supabase, rutas ni datos reales.
