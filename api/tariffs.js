import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { TARIFFS } from './_lib/mock.js';
import { mapPricelist } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  try {
    if (MOCK_MODE) return res.status(200).json(TARIFFS);
    const rows = await search_read('product.pricelist', [], ['name','currency_id'], { limit: 50 });
    res.status(200).json(rows.map(mapPricelist));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
