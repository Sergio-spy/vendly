import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { PRODUCTS } from './_lib/mock.js';
import { mapTemplate } from './_lib/mappers.js';
import { resolveFamilies } from './_lib/families.js';
import { requireComercial } from './_lib/auth.js';

// Devuelve un artículo (product.template) por línea — las variantes se eligen
// en el modal del producto, no en el catálogo principal.
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

    const fields = [
      'name', 'default_code', 'barcode',
      'list_price', 'qty_available', 'categ_id',
      'product_variant_count', 'product_variant_ids',
    ];
    const rows = await search_read('product.template', domain, fields, { limit: 1000 });
    res.status(200).json(rows.map(mapTemplate));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
