// Resolución y cálculo de tarifas (product.pricelist) en Odoo.
// - La tarifa por defecto es "Comercial PVP". Su id se cachea por proceso.
// - Si se pasa partnerId, se usa la pricelist asignada al cliente
//   (property_product_pricelist). Si el cliente no tiene → fallback a la default.
//
// Estrategia para obtener precios aplicados:
// Leemos `product.product.price` con `context = { pricelist, partner }`.
// El campo `price` es computed y respeta el pricelist del contexto en cualquier
// versión de Odoo (más fiable que `_compute_price_rule`, que ha cambiado de
// firma entre versiones y no es API pública).

import { search_read, call } from './odoo.js';

const DEFAULT_PRICELIST_NAME = 'Comercial PVP';

let _defaultPricelistIdPromise = null;
async function getDefaultPricelistId() {
  if (!_defaultPricelistIdPromise) {
    _defaultPricelistIdPromise = (async () => {
      const rows = await search_read('product.pricelist',
        [['name','=ilike', DEFAULT_PRICELIST_NAME]], ['id'], { limit: 1 });
      return rows[0]?.id || null;
    })().catch((e) => { _defaultPricelistIdPromise = null; throw e; });
  }
  return _defaultPricelistIdPromise;
}

// Devuelve el pricelistId a aplicar para un partnerId dado (o el default si no hay).
export async function resolvePricelistId(partnerId) {
  if (partnerId) {
    const rows = await search_read('res.partner',
      [['id','=', partnerId]], ['property_product_pricelist'], { limit: 1 });
    const pl = rows[0]?.property_product_pricelist;
    const id = Array.isArray(pl) ? pl[0] : null;
    if (id) return id;
  }
  return getDefaultPricelistId();
}

// Calcula precios aplicando la pricelist a una lista de product.product (variantIds).
// Devuelve Map<variantId, price>. Si la llamada falla, devuelve mapa vacío
// (los callers usan list_price como fallback).
export async function computePrices(pricelistId, variantIds, partnerId = null) {
  const map = new Map();
  if (!pricelistId || !variantIds?.length) return map;

  // 1) Intento principal: product.product.read con context.pricelist.
  //    El campo `price` es computed y refleja la tarifa del contexto.
  try {
    const ctx = { pricelist: pricelistId };
    if (partnerId) ctx.partner = partnerId;
    const rows = await call('product.product', 'read',
      [variantIds, ['id', 'price']],
      { context: ctx });
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r && typeof r.price === 'number') map.set(r.id, r.price);
      }
      if (map.size) return map;
    }
  } catch (e) {
    console.warn('[pricing] read(price, context.pricelist) falló:', e.message);
  }

  // 2) Fallback: _compute_price_rule (firma antigua, puede fallar en Odoo nuevo).
  try {
    const result = await call('product.pricelist', '_compute_price_rule',
      [[pricelistId], variantIds, 1, partnerId || false]);
    const vmap = result?.[pricelistId] ?? result;
    if (vmap && typeof vmap === 'object') {
      for (const vId of variantIds) {
        const entry = vmap[vId];
        const price = Array.isArray(entry) ? entry[0] : (typeof entry === 'number' ? entry : null);
        if (price != null) map.set(vId, price);
      }
    }
  } catch (e) {
    console.warn('[pricing] _compute_price_rule falló:', e.message);
  }
  return map;
}
