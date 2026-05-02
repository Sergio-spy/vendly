// Objetivos de venta por comercial (mensual / anual).
//   GET  /api/goals          (admin)  → { enabled, goals: { [comercialId]: { monthly, yearly, updatedAt } } }
//   PUT  /api/goals          (admin)  body { comercialId, monthly, yearly }
//   GET  /api/goals?me=1     (cualquier user) → { goal: { monthly, yearly } } del logueado
//
// Persistencia: Vercel KV (Redis). Se guarda un único registro 'goals' como
// objeto JSON con la tabla de todos los comerciales.

import { kvGet, kvSet, KV_ENABLED } from './_lib/kv.js';
import { COMERCIALES } from './_lib/comerciales.js';
import { requireComercial } from './_lib/auth.js';

const KEY = 'goals';

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;

  // Endpoint "me" para que cada comercial lea su propio objetivo.
  if (req.method === 'GET' && req.query?.me === '1') {
    const all = (await kvGet(KEY)) || {};
    return res.status(200).json({ goal: all[c.id] || null });
  }

  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  if (req.method === 'GET') {
    const data = (await kvGet(KEY)) || {};
    return res.status(200).json({ enabled: KV_ENABLED, goals: data });
  }

  if (req.method === 'PUT') {
    if (!KV_ENABLED) return res.status(503).json({
      error: 'Vercel KV no está configurado. Crea un KV store en Vercel (Storage → Create → KV) y conéctalo al proyecto.',
    });
    const { comercialId, monthly, yearly } = req.body || {};
    if (!comercialId) return res.status(400).json({ error: 'Falta comercialId' });
    if (!COMERCIALES.find(x => x.id === comercialId)) return res.status(400).json({ error: 'comercialId no existe' });

    const all = (await kvGet(KEY)) || {};
    all[comercialId] = {
      monthly: Number(monthly) || 0,
      yearly:  Number(yearly)  || 0,
      updatedAt: new Date().toISOString(),
    };
    await kvSet(KEY, all);
    return res.status(200).json({ ok: true, goals: all });
  }

  res.status(405).end();
}
