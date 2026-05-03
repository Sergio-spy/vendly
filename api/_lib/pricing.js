// Resolución y cálculo de tarifas (product.pricelist) en Odoo.
//
// Por qué calculamos el precio nosotros y no Odoo:
//   Odoo SaaS reciente bloquea TODOS los métodos privados (`_compute_price_rule`,
//   `_get_product_price`, `_get_products_price`) con "Private methods cannot be
//   called remotely". El método público legacy `price_get` ya no existe. No queda
//   API remota para que Odoo devuelva el precio aplicado de una pricelist.
//   Solución: leemos las reglas (`product.pricelist.item`) y las aplicamos en JS.
//
// Cobertura actual: la única configuración usada en producción es una regla
// global (`applied_on='3_global'`) por tarifa, con `compute_price='formula'`,
// `base='standard_price' | 'list_price' | 'pricelist'` y `price_discount`,
// `price_surcharge`, `price_round`, `price_min_margin`, `price_max_margin`.
// También se soportan reglas con scope (`1_product`, `0_product_variant`,
// `2_product_category`) y `compute_price='fixed' | 'percentage'` para cubrir
// expansiones futuras sin tocar este archivo.

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

// Cache de items por pricelist (proceso). Las reglas cambian poco; rotamos al
// reiniciar la lambda. Si necesitas invalidar antes, redeploya.
const _itemsCache = new Map();
async function getPricelistItems(pricelistId) {
  if (_itemsCache.has(pricelistId)) return _itemsCache.get(pricelistId);
  const items = await search_read('product.pricelist.item',
    [['pricelist_id','=', pricelistId]],
    ['applied_on','base','base_pricelist_id','compute_price',
     'fixed_price','percent_price','price_discount','price_surcharge',
     'price_round','price_min_margin','price_max_margin',
     'product_id','product_tmpl_id','categ_id',
     'min_quantity','date_start','date_end'],
    { limit: 500 });
  _itemsCache.set(pricelistId, items);
  return items;
}

const today = () => new Date().toISOString().slice(0,10);

function ruleMatches(rule, product, qty = 1) {
  if (rule.min_quantity && qty < rule.min_quantity) return false;
  if (rule.date_start && rule.date_start > today()) return false;
  if (rule.date_end   && rule.date_end   < today()) return false;
  switch (rule.applied_on) {
    case '0_product_variant':
      return Array.isArray(rule.product_id) && rule.product_id[0] === product.id;
    case '1_product':
      return Array.isArray(rule.product_tmpl_id) && rule.product_tmpl_id[0] === product.product_tmpl_id;
    case '2_product_category':
      return Array.isArray(rule.categ_id) && rule.categ_id[0] === product.categ_id;
    case '3_global':
    default:
      return true;
  }
}

// Aplica una regla a un producto y devuelve el precio resultante.
function applyRule(rule, product, qty, baseResolver) {
  // Base sobre la que aplica la fórmula
  let base;
  switch (rule.base) {
    case 'standard_price': base = product.standard_price ?? 0; break;
    case 'pricelist':
      // No soportado en profundidad (pricelist encadenada). Caemos a list_price.
      base = product.list_price ?? 0;
      break;
    case 'list_price':
    default:
      base = product.list_price ?? 0;
  }

  let price;
  switch (rule.compute_price) {
    case 'fixed':
      price = rule.fixed_price ?? 0;
      break;
    case 'percentage':
      price = base * (1 - (rule.percent_price || 0) / 100);
      break;
    case 'formula':
    default: {
      const discount = rule.price_discount || 0;
      const surcharge = rule.price_surcharge || 0;
      price = base * (1 - discount / 100) + surcharge;
      // Redondeo (price_round = step)
      const step = rule.price_round || 0;
      if (step) price = Math.round(price / step) * step;
      // Márgenes
      if (rule.price_min_margin) price = Math.max(price, base + rule.price_min_margin);
      if (rule.price_max_margin) price = Math.min(price, base + rule.price_max_margin);
      break;
    }
  }
  return price;
}

// Calcula precios aplicando la pricelist a una lista de product.product (variantIds).
// Devuelve Map<variantId, price>.
export async function computePrices(pricelistId, variantIds, partnerId = null) {
  const map = new Map();
  if (!pricelistId || !variantIds?.length) return map;
  try {
    const [items, products] = await Promise.all([
      getPricelistItems(pricelistId),
      search_read('product.product',
        [['id','in', variantIds]],
        ['id','product_tmpl_id','categ_id','standard_price','list_price'],
        { limit: variantIds.length }),
    ]);
    if (!items.length) return map;
    // Normalizamos relacionales m2o ([id,name]) a número.
    const normProducts = products.map(p => ({
      id: p.id,
      product_tmpl_id: Array.isArray(p.product_tmpl_id) ? p.product_tmpl_id[0] : p.product_tmpl_id,
      categ_id: Array.isArray(p.categ_id) ? p.categ_id[0] : p.categ_id,
      standard_price: p.standard_price || 0,
      list_price: p.list_price || 0,
    }));
    // Orden: las reglas más específicas primero (la primera que matchee gana).
    const specificity = { '0_product_variant': 0, '1_product': 1, '2_product_category': 2, '3_global': 3 };
    const ordered = [...items].sort((a,b) => (specificity[a.applied_on] ?? 9) - (specificity[b.applied_on] ?? 9));
    for (const p of normProducts) {
      const rule = ordered.find(r => ruleMatches(r, p, 1));
      if (!rule) continue;
      const price = applyRule(rule, p, 1);
      if (typeof price === 'number') map.set(p.id, price);
    }
  } catch (e) {
    console.warn('[pricing] computePrices falló:', e.message);
  }
  return map;
}
