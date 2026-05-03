// TEMPORAL — verifica dónde está el SKU en Odoo (template vs variante).
// GET /api/debug-sku?templateIds=1048,952,1095

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });
  const templateIds = (req.query?.templateIds || '').split(',').map(s => parseInt(s,10)).filter(Boolean);
  if (!templateIds.length) return res.status(400).json({ error: 'Faltan templateIds' });

  const templates = await search_read('product.template',
    [['id','in', templateIds]],
    ['id','name','default_code','barcode','product_variant_count','product_variant_ids'],
    { limit: templateIds.length });

  const allVariantIds = templates.flatMap(t => t.product_variant_ids || []);
  const variants = await search_read('product.product',
    [['id','in', allVariantIds]],
    ['id','product_tmpl_id','default_code','barcode','display_name','code','active'],
    { limit: allVariantIds.length });

  const out = templates.map(t => ({
    templateId: t.id,
    name: t.name,
    template_default_code: t.default_code,
    template_barcode: t.barcode,
    variantCount: t.product_variant_count,
    variants: variants
      .filter(v => (Array.isArray(v.product_tmpl_id) ? v.product_tmpl_id[0] : v.product_tmpl_id) === t.id)
      .map(v => ({
        id: v.id,
        display_name: v.display_name,
        default_code: v.default_code,
        barcode: v.barcode,
        active: v.active,
      })),
  }));

  res.status(200).json(out);
}
