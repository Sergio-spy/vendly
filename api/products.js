import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { PRODUCTS } from './_lib/mock.js';
import { mapProduct } from './_lib/mappers.js';
import { resolveFamilies } from './_lib/families.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  try {
    if (MOCK_MODE) return res.status(200).json(PRODUCTS);

    // Resolvemos los IDs de las categorías configuradas → así solo
    // traemos los productos de las familias relevantes (no todo el catálogo).
    const cats = await search_read('product.category', [], ['name','complete_name','parent_id'], { limit: 500 });
    const familyIds = resolveFamilies(cats).filter(f => f.odooId != null).map(f => f.odooId);

    const domain = [['sale_ok','=',true]];
    if (familyIds.length) domain.push(['categ_id','in', familyIds]);

    const fields = ['name','display_name','default_code','list_price','qty_available','categ_id'];
    const rows = await search_read('product.product', domain, fields, { limit: 1000 });
    res.status(200).json(rows.map(mapProduct));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
