// GET /api/tags — devuelve las etiquetas de cliente (res.partner.category) de Odoo.
// Útil para encontrar los IDs que tienes que poner en api/_lib/comerciales.js.
//
// Tienes que estar logueado para verlas (evita exposición pública).

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  try {
    if (MOCK_MODE) return res.status(200).json([]);
    const rows = await search_read('res.partner.category', [], ['name','color','parent_id'], { limit: 200, order: 'name asc' });
    res.status(200).json(rows.map(r => ({
      id: r.id, name: r.name, color: r.color || 0,
      parent: r.parent_id ? r.parent_id[1] : null,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
