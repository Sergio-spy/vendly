import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
  plugins: [react(), apiMiddleware()],
})
