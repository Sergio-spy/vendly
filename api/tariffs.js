import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { TARIFFS } from './_lib/mock.js';
import { mapPricelist } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;
  try {
    if (MOCK_MODE) return res.status(200).json(TARIFFS);
    // Admin ve todas las tarifas; comerciales solo las que empiezan por "Comercial".
    const domain = c.role === 'admin' ? [] : [['name','=ilike','Comercial%']];
    const rows = await search_read('product.pricelist', domain, ['name','currency_id'], { limit: 50 });
    res.status(200).json(rows.map(mapPricelist));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
