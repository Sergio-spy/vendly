// POST /api/pricelist-compare
// Body: { templateIds: number[], pricelistIds: number[] }
// Devuelve la matriz de precios reales aplicando cada tarifa de Odoo a cada
// template (toma la primera variante del template como representante).
//   { products:[{templateId,name,sku,pvp}], prices:{ [tplId]: { [plistId]: price } } }

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (req.method !== 'POST') return res.status(405).end();

  const templateIds  = (req.body?.templateIds  || []).map(n => parseInt(n,10)).filter(Boolean);
  const pricelistIds = (req.body?.pricelistIds || []).map(n => parseInt(n,10)).filter(Boolean);
  if (!templateIds.length)  return res.status(400).json({ error: 'Faltan templateIds' });
  if (!pricelistIds.length) return res.status(400).json({ error: 'Faltan pricelistIds' });

  if (MOCK_MODE) {
    return res.status(200).json({ products: [], prices: {} });
  }

  try {
    // 1) Templates con la primera variante (product.product) como representante.
    const templates = await search_read('product.template',
      [['id','in', templateIds]],
      ['name','default_code','list_price','product_variant_ids'],
      { limit: templateIds.length });

    const variantIdByTemplate = new Map();
    const products = [];
    for (const t of templates) {
      const vId = (t.product_variant_ids || [])[0] || null;
      if (vId) variantIdByTemplate.set(t.id, vId);
      products.push({
        templateId: t.id,
        name:       t.name,
        sku:        t.default_code || '',
        pvp:        t.list_price || 0,
      });
    }

    // 2) Para cada combinación pricelist × variante, obtener el precio aplicado.
    //    Odoo expone product.pricelist._compute_price_rule(products, qty, partner)
    //    que devuelve { product_id: [price, rule_id] }.
    const variantIds = [...variantIdByTemplate.values()];
    const prices = {};
    for (const tId of templateIds) prices[tId] = {};

    if (variantIds.length) {
      // Una llamada por pricelist es lo más fiable para la API JSON-RPC.
      for (const plId of pricelistIds) {
        try {
          const result = await call('product.pricelist', '_compute_price_rule', [[plId], variantIds, 1, false]);
          // El shape puede venir { plistId: { variantId: [price,rule] } } o directamente { variantId: [price,rule] }
          // según versión Odoo. Normalizamos buscando la primera capa que mapee a number→[price,rule].
          let vmap = result?.[plId] ?? result;
          if (vmap && typeof vmap === 'object') {
            for (const [tId, vId] of variantIdByTemplate.entries()) {
              const entry = vmap[vId];
              const price = Array.isArray(entry) ? entry[0] : (typeof entry === 'number' ? entry : null);
              if (price != null) prices[tId][plId] = price;
            }
          }
        } catch (e) {
          // Si _compute_price_rule no existe (Odoo viejo) o falla, dejamos hueco.
          console.warn('[pricelist-compare] fallo _compute_price_rule', plId, e.message);
        }
      }
    }

    res.status(200).json({ products, prices });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
