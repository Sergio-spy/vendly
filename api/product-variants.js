// GET /api/product-variants?templateId=123
// Devuelve las variantes (product.product) de un template, con sus atributos
// extraídos del display_name "Nombre (Color: Azul, Tamaño: M)".

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { mapVariant } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  const templateId = parseInt(req.query?.templateId, 10);
  if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

  if (MOCK_MODE) return res.status(200).json([]);

  try {
    const fields = ['name','display_name','default_code','barcode','list_price','qty_available'];
    const rows = await search_read(
      'product.product',
      [['product_tmpl_id','=', templateId]],
      fields,
      { limit: 200 }
    );
    res.status(200).json(rows.map(mapVariant));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
