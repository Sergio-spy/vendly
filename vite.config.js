import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Plugin Vite que monta los archivos de ./api/*.js como endpoints HTTP en dev,
// emulando el comportamiento de Vercel serverless functions.
// En producción Vercel sirve estos mismos archivos sin tocar nada.
function apiMiddleware() {
  return {
    name: 'vendly-api-middleware',
    configureServer(server) {
      const apiDir = join(server.config.root, 'api')

      // Devuelve la lista de rutas disponibles a partir de los .js bajo api/
      const routes = []
      function walk(dir) {
        for (const f of readdirSync(dir)) {
          if (f.startsWith('_')) continue
          const p = join(dir, f)
          if (statSync(p).isDirectory()) walk(p)
          else if (f.endsWith('.js')) {
            const route = '/' + relative(apiDir, p).replace(/\.js$/, '').replace(/\\/g, '/')
            routes.push({ route, file: p })
          }
        }
      }
      try { walk(apiDir) } catch {}

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const path = req.url.split('?')[0].replace(/^\/api/, '')
        const match = routes.find(r => r.route === path)
        if (!match) { res.statusCode = 404; res.end('Not found'); return }

        // Parse query
        const u = new URL(req.url, 'http://x')
        req.query = Object.fromEntries(u.searchParams)

        // Parse body (json) en POST/PUT/PATCH
        if (['POST','PUT','PATCH'].includes(req.method)) {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString('utf8')
          try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
        }

        // Shim Express-style sobre node http
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(obj)); return res }

        try {
          const mod = await server.ssrLoadModule(match.file)
          await mod.default(req, res)
        } catch (e) {
          console.error('[api]', match.route, e)
          res.statusCode = 500
          res.setHeader('Content-Type','application/json')
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    apiMiddleware(),
    VitePWA({
      registerType: 'autoUpdate',
      // Habilitamos el SW también en dev para poder probar offline en local.
      devOptions: { enabled: false },
      includeAssets: ['favicon.svg', 'logo.svg'],
      manifest: {
        name: 'Vendly · Palomatic',
        short_name: 'Vendly',
        description: 'Catálogo y pedidos para el equipo comercial',
        theme_color: '#222222',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // No cachees el shell de las funciones serverless con SW: muchas son
        // mutaciones y autenticadas. Cacheamos selectivamente con runtimeCaching.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Hot updates: nuevos SW toman control inmediatamente sin cerrar la
        // PWA. Es lo que queremos en una app interna donde cada deploy debe
        // llegar al iPad sin pasos manuales.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Datos del catálogo / clientes / tarifas: stale-while-revalidate
            // permite arrancar offline con la última copia.
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/bootstrap')   ||
              url.pathname.startsWith('/api/products')    ||
              url.pathname.startsWith('/api/clients')     ||
              url.pathname.startsWith('/api/tariffs')     ||
              url.pathname.startsWith('/api/orders')      ||
              url.pathname.startsWith('/api/families')    ||
              url.pathname.startsWith('/api/promos')      ||
              url.pathname.startsWith('/api/product-variants'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vendly-api-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Imágenes de producto: cache-first con TTL largo.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/product-image'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'vendly-product-images',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
