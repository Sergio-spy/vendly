// TEMPORAL — diagnóstico de credenciales. Solo admin.
// GET  /api/debug-comercial?id=german  → estado del comercial (sin hash).
// POST /api/debug-comercial  body { login, password } → indica si la
//   combinación es válida (= el comercial podría iniciar sesión con ella).

import { requireComercial, verifyPassword } from './_lib/auth.js';
import { loadComerciales, COMERCIALES_KV_KEY } from './_lib/comerciales.js';
import { kvGet } from './_lib/kv.js';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  if (req.method === 'POST') {
    const { login, password } = req.body || {};
    if (!login || !password) return res.status(400).json({ error: 'Falta login o password' });
    const all = await loadComerciales();
    const target = all.find(x => x.login?.toLowerCase() === String(login).toLowerCase());
    if (!target) return res.status(200).json({ found: false, matches: false });
    const matches = verifyPassword(String(password), target.passwordHash || '');
    return res.status(200).json({
      found: true,
      matches,
      id: target.id,
      passwordLength: String(password).length,
      passwordCharsCodes: [...String(password)].map(ch => ch.charCodeAt(0)),
    });
  }

  const id = String(req.query?.id || '');
  if (!id) return res.status(400).json({ error: 'Falta id' });

  const all = await loadComerciales();
  const target = all.find(x => x.id === id);
  const overrides = (await kvGet(COMERCIALES_KV_KEY).catch(() => null)) || {};
  const ov = overrides[id] || null;

  res.status(200).json({
    id,
    foundInMerge: !!target,
    login: target?.login,
    role: target?.role,
    archived: ov?.archived || false,
    hasOverride: !!ov,
    overrideHasPasswordHash: !!ov?.passwordHash,
    passwordHashOrigin: ov?.passwordHash ? 'override (KV)' : (target ? 'archivo' : 'ninguno'),
    overrideUpdatedAt: ov?.updatedAt || null,
  });
}
