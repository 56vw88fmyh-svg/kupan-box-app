import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { getGymConfig, resolveGymId } from './src/config/gyms.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const gymConfig = getGymConfig(resolveGymId({ explicitId: process.env.VITE_GYM_ID || env.VITE_GYM_ID }))
  const title = `${gymConfig.identity.name} · ${gymConfig.identity.descriptor}`
  const description = `${gymConfig.identity.name}: app para reservas, planes y comunidad del centro de entrenamiento.`

  return {
    plugins: [
      react(),
      {
        name: 'white-label-index',
        transformIndexHtml(html) {
          return html
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace('href="/manifest.webmanifest"', `href="/manifests/${gymConfig.id}.webmanifest"`)
            .replace(/content="KUPAN: app progresiva[^"]*"/, `content="${description}"`)
            .replaceAll('content="KUPAN"', `content="${gymConfig.identity.name}"`)
            .replaceAll('content="KUPAN · CrossFit Box"', `content="${title}"`)
            .replaceAll('content="/brand/logo-kupan.png"', `content="${gymConfig.assets.socialImage}"`)
            .replaceAll('href="/icons/icon-192.png"', `href="${gymConfig.assets.pwaIcon}"`)
            .replace('content="Reserva clases, revisa horarios, WOD del día, planes y comunidad KUPAN."', `content="${description}"`)
            .replace('content="App progresiva para reservas, horarios, WOD y comunidad KUPAN."', `content="${description}"`)
            .replace('content="#0E1011"', `content="${gymConfig.theme.background}"`)
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react'
            return 'vendor'
          },
        },
      },
    },
  }
})
