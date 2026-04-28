import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { PRODUCTS } from './_lib/mock.js';
import { mapProduct } from './_lib/mappers.js';

export default async function handler(req, res) {
  try {
    if (MOCK_MODE) return res.status(200).json(PRODUCTS);
    const fields = ['name','display_name','default_code','list_price','qty_available','categ_id'];
    const rows = await search_read('product.product', [['sale_ok','=',true]], fields, { limit: 500 });
    res.status(200).json(rows.map(mapProduct));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
