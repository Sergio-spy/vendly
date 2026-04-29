// GET /api/families — lista de familias del catálogo, mapeadas a categorías Odoo.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { resolveFamilies } from './_lib/families.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  try {
    if (MOCK_MODE) return res.status(200).json([]);

    // 1) Categorías de Odoo
    const cats = await search_read('product.category', [], ['name','complete_name','parent_id'], { limit: 500 });

    // 2) Conteo de productos por categoría (solo vendibles)
    //    read_group nos devuelve {categ_id: [id, name], categ_id_count: N}
    const groups = await search_read('product.product', [['sale_ok','=',true]], ['categ_id'], { limit: 1000 });
    const counts = new Map();
    for (const g of groups) {
      const id = Array.isArray(g.categ_id) ? g.categ_id[0] : g.categ_id;
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    const fams = resolveFamilies(cats, counts);
    res.status(200).json(fams);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
