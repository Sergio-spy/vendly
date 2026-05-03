// TEMPORAL — debug de precios por tarifa en Odoo. Eliminar tras verificar.
// GET /api/debug-pricing?variantId=123&pricelistId=13[&partnerId=276]

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });

  const variantId   = parseInt(req.query?.variantId, 10);
  const pricelistId = parseInt(req.query?.pricelistId, 10);
  const partnerId   = parseInt(req.query?.partnerId, 10) || null;
  if (!variantId || !pricelistId) return res.status(400).json({ error: 'Faltan variantId/pricelistId' });

  const out = { variantId, pricelistId, partnerId, attempts: {} };

  // 0) Reglas configuradas en la pricelist
  try {
    const items = await search_read('product.pricelist.item',
      [['pricelist_id','=', pricelistId]],
      ['id','applied_on','base','compute_price','fixed_price','percent_price','price_discount','product_id','product_tmpl_id','categ_id','min_quantity','date_start','date_end'],
      { limit: 200 });
    out.rules = { count: items.length, sample: items.slice(0, 5) };
  } catch (e) { out.rules = { error: e.message }; }

  // 1) read price con context.pricelist
  try {
    const ctx = { pricelist: pricelistId };
    if (partnerId) ctx.partner = partnerId;
    const rows = await call('product.product', 'read', [[variantId], ['price','lst_price','list_price']], { context: ctx });
    out.attempts.read_price_ctx = rows;
  } catch (e) { out.attempts.read_price_ctx = { error: e.message }; }

  // 2) _compute_price_rule (firma vieja)
  try {
    const r = await call('product.pricelist', '_compute_price_rule', [[pricelistId], [variantId], 1, partnerId || false]);
    out.attempts.compute_price_rule = r;
  } catch (e) { out.attempts.compute_price_rule = { error: e.message }; }

  // 3) _get_product_price (público interno Odoo 16+)
  try {
    const r = await call('product.pricelist', '_get_product_price', [[pricelistId], variantId, 1], { context: partnerId ? { partner: partnerId } : {} });
    out.attempts.get_product_price = r;
  } catch (e) { out.attempts.get_product_price = { error: e.message }; }

  // 4) _get_products_price (público interno Odoo 16+, batch)
  try {
    const r = await call('product.pricelist', '_get_products_price', [[pricelistId], [variantId], 1], { context: partnerId ? { partner: partnerId } : {} });
    out.attempts.get_products_price = r;
  } catch (e) { out.attempts.get_products_price = { error: e.message }; }

  // 5) price_get (legacy)
  try {
    const r = await call('product.pricelist', 'price_get', [[pricelistId], variantId, 1, partnerId || false]);
    out.attempts.price_get = r;
  } catch (e) { out.attempts.price_get = { error: e.message }; }

  res.status(200).json(out);
}
