# KUPAN

App web progresiva para el box de CrossFit KUPAN. Funciona como sitio web instalable en celular y navegador, con secciones de inicio, horarios, reservas, WOD del día, planes, comunidad y perfil.

## En Simple

Este proyecto es la app de KUPAN lista para publicarse en internet. Para subirla a Vercel o Netlify no necesitas configurar servidores: esas plataformas leen el proyecto, ejecutan el comando de construcción y publican la carpeta final automáticamente.

## Qué Incluye

- Diseño mobile-first.
- PWA instalable.
- Navegación inferior tipo app móvil con rutas reales de React Router.
- Datos editables sin backend, guardados en el navegador.
- Flujo local de reserva de clases con persistencia en `localStorage`.
- Planes con links de pago y WhatsApp.
- Panel admin temporal protegido con clave simple.
- Login y registro local de usuarios sin backend.
- Configuración para Vercel y Netlify.

## Requisitos

Necesitas tener instalado:

- Node.js 20 o superior
- npm

Para revisar si lo tienes:

```bash
node -v
npm -v
```

## Instalar El Proyecto

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto descarga las dependencias necesarias.

## Ver La App En Tu Computador

```bash
npm run dev
```

Luego abre la URL que aparezca en la terminal. Normalmente será:

```bash
http://localhost:5173/
```

## Revisar Antes De Publicar

Ejecuta:

```bash
npm run check
```

Ese comando revisa errores y crea la versión final de producción.

También puedes ejecutar los pasos por separado:

```bash
npm run lint
npm run build
```

## Versión De Producción

Para crear la versión final:

```bash
npm run build
```

La carpeta publicada será:

```text
dist/
```

## Probar La Versión Final

Después de construir:

```bash
npm run preview
```

Abre la URL que indique la terminal.

## Publicar En Vercel

1. Sube este proyecto a GitHub.
2. Entra a Vercel.
3. Elige **Add New Project**.
4. Selecciona el repositorio de KUPAN.
5. Vercel debería detectar Vite automáticamente.
6. Revisa que diga:

```text
Build Command: npm run build
Output Directory: dist
```

7. Presiona **Deploy**.

El archivo `vercel.json` ya deja lista la configuración básica.

## Publicar En Netlify

1. Sube este proyecto a GitHub.
2. Entra a Netlify.
3. Elige **Add new site**.
4. Conecta el repositorio de KUPAN.
5. Revisa que diga:

```text
Build command: npm run build
Publish directory: dist
```

6. Presiona **Deploy**.

El archivo `netlify.toml` ya deja lista la configuración básica.

## Probar Que La PWA Es Instalable

Cuando la app esté publicada o corriendo en local:

1. Abre la app en Chrome.
2. Abre DevTools.
3. Ve a **Application > Manifest**.
4. Revisa que aparezca el nombre **KUPAN** y sus iconos.
5. En Chrome móvil, abre la web y busca **Instalar app** o **Agregar a pantalla principal**.

Importante: la instalación PWA funciona mejor en una URL segura `https://`, como Vercel o Netlify.

## Estructura Del Proyecto

```text
src/
  components/   Componentes compartidos
  data/         Datos simulados
  pages/        Páginas principales
  App.jsx       Navegación y estado general
  main.jsx      Entrada de React y registro PWA
  styles.css    Tailwind y estilos base
public/
  icons/        Iconos temporales PWA
  brand/        Copia pública de logos para PWA y navegador
  manifest.webmanifest
  sw.js
  kupan-icon.svg
```

## Notas Importantes

- Las reservas se guardan en `localStorage`, por eso se mantienen al recargar en el mismo navegador.
- Las cuentas de usuario y la sesión también se guardan temporalmente en `localStorage`.
- El panel admin también guarda cambios en `localStorage`.
- No hay backend todavía.
- La autenticación local es solo para prototipo; las contraseñas deben moverse a un sistema seguro antes de producción.
- La clave admin actual es temporal y no reemplaza autenticación real.
- Para producción real, el siguiente paso natural es conectar usuarios, pagos, reservas y contenido admin a una base de datos.
