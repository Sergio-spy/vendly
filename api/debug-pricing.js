// TEMPORAL — verifica precios producto a producto.
// GET /api/debug-pricing?templateIds=1,2,3

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';
import { computePrices } from './_lib/pricing.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });
  const templateIds = (req.query?.templateIds || '').split(',').map(s => parseInt(s,10)).filter(Boolean);
  if (!templateIds.length) return res.status(400).json({ error: 'Faltan templateIds' });

  // 1) Templates → primera variante
  const templates = await search_read('product.template',
    [['id','in', templateIds]],
    ['id','name','default_code','list_price','product_variant_ids'],
    { limit: templateIds.length });

  const variantIds = [];
  const tplByVid = new Map();
  for (const t of templates) {
    const vId = (t.product_variant_ids || [])[0];
    if (vId) { variantIds.push(vId); tplByVid.set(vId, t); }
  }

  // 2) Variantes con standard_price y list_price
  const variants = await search_read('product.product',
    [['id','in', variantIds]],
    ['id','display_name','default_code','standard_price','list_price','product_tmpl_id','categ_id'],
    { limit: variantIds.length });

  // 3) Cálculo con cada pricelist
  const [pDist, pTie, pPVP] = await Promise.all([
    computePrices(11, variantIds, null),
    computePrices(12, variantIds, null),
    computePrices(13, variantIds, null),
  ]);

  const out = variants.map(v => ({
    variantId: v.id,
    name: v.display_name,
    sku: v.default_code,
    list_price_template: tplByVid.get(v.id)?.list_price,
    list_price_variant: v.list_price,
    standard_price: v.standard_price,
    expected_distribuidores: +(v.standard_price * 1.20).toFixed(4),
    expected_tiendas:        +(v.standard_price * 1.30).toFixed(4),
    expected_pvp:            +(v.standard_price * 1.40).toFixed(4),
    computed_distribuidores: pDist.get(v.id),
    computed_tiendas:        pTie.get(v.id),
    computed_pvp:            pPVP.get(v.id),
  }));

  res.status(200).json(out);
}
