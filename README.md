# Vendly · Webapp comercial

App para comerciales (tablet) conectada a Odoo SaaS vía JSON-RPC.
Frontend Vite + React, backend serverless Node (Vercel Functions).

## Estructura

```
vendly-app/
├── src/             ← React app (UI)
│   ├── App.jsx
│   ├── api.js       ← cliente fetch hacia /api/*
│   ├── components/
│   └── screens/
├── api/             ← Vercel serverless functions
│   ├── _lib/
│   │   ├── odoo.js     ← cliente JSON-RPC + modo MOCK
│   │   ├── mock.js     ← datos de prueba
│   │   └── mappers.js  ← Odoo → forma frontend
│   ├── health.js       /api/health
│   ├── products.js     /api/products
│   ├── clients.js      /api/clients
│   ├── tariffs.js      /api/tariffs
│   ├── promos.js       /api/promos
│   └── orders.js       /api/orders   (GET + POST)
├── vite.config.js   ← incluye middleware que sirve /api en dev
└── vercel.json
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Sin variables de entorno, la API trabaja en
**modo mock** (datos de prueba). En el topbar verás "modo mock".

## Conectar a Odoo

1. En Odoo, en tu perfil de usuario, **genera una API Key**.
2. Crea `.env.local` (no se commitea) con:

   ```
   ODOO_URL=https://tuempresa.odoo.com
   ODOO_DB=tu-base-de-datos
   ODOO_USER=usuario@tuempresa.com
   ODOO_API_KEY=la-api-key
   ```

3. Reinicia `npm run dev`. El topbar pasará a "Odoo · live".

## Deploy a Vercel

1. Sube el repo a GitHub.
2. En Vercel: **New Project → Import** ese repo.
3. Vercel detecta Vite automáticamente. Pulsa **Deploy**.
4. Una vez deployado, ve a **Settings → Environment Variables** y añade
   `ODOO_URL`, `ODOO_DB`, `ODOO_USER`, `ODOO_API_KEY` (valores de tu Odoo).
5. Redeploy desde la pestaña Deployments.

Sin las variables, la app funciona igual pero con datos mock — útil para
demos y para validar el deploy antes de tener Odoo listo.

## Mappings Odoo

Los mapeos entre modelos Odoo y la forma esperada por el frontend están
en `api/_lib/mappers.js`. Si tu instancia tiene módulos custom (ej. campo
`product_brand_id`, categorías propias) ajusta ahí. Modelos usados:

- `res.partner` (clientes)
- `product.product` (productos)
- `product.pricelist` (tarifas)
- `sale.order` (pedidos)

## Pendiente

- Login real contra Odoo (ahora se entra directo, en modo demo).
- Stock por almacén (`stock.quant` agrupado por `location_id`).
- Promociones desde `loyalty.program` (depende de versión Odoo).
- Modo offline real (Service Worker + IndexedDB).
