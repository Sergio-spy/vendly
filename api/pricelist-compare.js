// POST /api/pricelist-compare
// Body: { templateIds: number[], pricelistIds: number[] }
// Devuelve la matriz de precios reales aplicando cada tarifa de Odoo a cada
// template (toma la primera variante del template como representante).
//   { products:[{templateId,name,sku,pvp}], prices:{ [tplId]: { [plistId]: price } } }

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';
import { computePrices, getComercialPvpId, COMERCIAL_PVP_MARKUP_FOR_SALES } from './_lib/pricing.js';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
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
      ['name','default_code','x_studio_referencia','list_price','product_variant_ids'],
      { limit: templateIds.length });

    const variantIdByTemplate = new Map();
    const products = [];
    for (const t of templates) {
      const vId = (t.product_variant_ids || [])[0] || null;
      if (vId) variantIdByTemplate.set(t.id, vId);
      products.push({
        templateId: t.id,
        name:       t.name,
        sku:        t.x_studio_referencia || t.default_code || '',
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
      const pvpId = await getComercialPvpId();
      for (const plId of pricelistIds) {
        const priceByVariant = await computePrices(plId, variantIds, null);
        // Solo Comercial PVP se infla un 15% para no-admin (las otras tarifas
        // son las que el comercial vende a sus clientes y deben verse reales).
        // Portal-cliente no recibe markup (es el cliente final).
        const markup = (c.role !== 'admin' && !c.portalPartnerId && plId === pvpId) ? COMERCIAL_PVP_MARKUP_FOR_SALES : 1;
        for (const [tId, vId] of variantIdByTemplate.entries()) {
          if (priceByVariant.has(vId)) prices[tId][plId] = priceByVariant.get(vId) * markup;
        }
      }
    }

    res.status(200).json({ products, prices });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
