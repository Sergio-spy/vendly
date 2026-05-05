// GET  /api/images-version → devuelve la versión actual de imágenes.
// POST /api/images-version → admin only; setea la versión a Date.now() compactado.
//
// La versión global se concatena a TODAS las URLs de /api/product-image como
// `&v=<version>`. Cuando cambia, las cachés (browser, CDN Vercel, Service
// Worker) ven URLs nuevas y vuelven a fetch desde la lambda → Odoo.
//
// Útil cuando se actualizan imágenes en Odoo y se quiere forzar a TODOS los
// dispositivos a recargarlas sin esperar al TTL de 30 días del CDN.

import { kvGet, kvSet, KV_ENABLED } from './_lib/kv.js';
import { requireComercial } from './_lib/auth.js';

const KEY = 'imageVersion';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;

  if (req.method === 'GET') {
    if (!KV_ENABLED) return res.status(200).json({ version: '' });
    try {
      const v = await kvGet(KEY);
      return res.status(200).json({ version: v || '' });
    } catch (e) {
      return res.status(200).json({ version: '', error: e.message });
    }
  }

  if (req.method === 'POST') {
    if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    if (!KV_ENABLED) return res.status(503).json({ error: 'KV no configurado' });
    // Compacto basado en epoch ms — único garantizado y URL-safe.
    const v = String(Date.now());
    try {
      await kvSet(KEY, v);
      return res.status(200).json({ version: v });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
