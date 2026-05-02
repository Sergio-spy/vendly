// GET /api/comerciales (solo admin)
// Devuelve la lista de comerciales (api/_lib/comerciales.js) sin los hashes.

import { COMERCIALES } from './_lib/comerciales.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  const safe = COMERCIALES.map(x => ({
    id:        x.id,
    login:     x.login,
    name:      x.name,
    firstName: x.firstName,
    initials:  x.initials,
    email:     x.email || '',
    zone:      x.zone || '',
    role:      x.role,
    odooTagId: x.odooTagId,
  }));
  res.status(200).json(safe);
}
