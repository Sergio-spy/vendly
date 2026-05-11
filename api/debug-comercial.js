// TEMPORAL — diagnostica problemas de login. Solo admin.
// GET /api/debug-comercial?id=german[&password=xxx]
// Devuelve estado merge (sin exponer hash) y, si se pasa password,
// indica si valida contra el hash actual.

import { requireComercial, verifyPassword } from './_lib/auth.js';
import { loadComerciales, COMERCIALES_KV_KEY } from './_lib/comerciales.js';
import { kvGet } from './_lib/kv.js';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  const id = String(req.query?.id || '');
  if (!id) return res.status(400).json({ error: 'Falta id' });

  const all = await loadComerciales();
  const target = all.find(x => x.id === id);

  const overrides = (await kvGet(COMERCIALES_KV_KEY).catch(() => null)) || {};
  const ov = overrides[id] || null;

  let passwordMatches = null;
  const password = req.query?.password;
  if (password && target?.passwordHash) {
    passwordMatches = verifyPassword(String(password), target.passwordHash);
  }

  res.status(200).json({
    id,
    foundInMerge: !!target,
    login: target?.login,
    role: target?.role,
    archived: ov?.archived || false,
    hasOverride: !!ov,
    overrideHasPasswordHash: !!ov?.passwordHash,
    passwordHashPrefix: target?.passwordHash ? target.passwordHash.slice(0, 12) + '…' : null,
    passwordHashOrigin: ov?.passwordHash ? 'override (KV)' : (target ? 'archivo' : 'ninguno'),
    overrideUpdatedAt: ov?.updatedAt || null,
    passwordMatches,
  });
}
