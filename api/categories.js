// GET /api/categories — lista todas las product.category de Odoo.
// Útil para depurar el matching de la lista FAMILY_PATHS.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  try {
    if (MOCK_MODE) return res.status(200).json([]);
    const rows = await search_read('product.category', [], ['name','complete_name','parent_id'], { limit: 500, order: 'complete_name asc' });
    res.status(200).json(rows.map(r => ({ id: r.id, name: r.name, complete: r.complete_name })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
