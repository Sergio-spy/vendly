// Resolución y cálculo de tarifas (product.pricelist) en Odoo.
//
// Por qué calculamos el precio nosotros y no Odoo:
//   Odoo SaaS reciente bloquea TODOS los métodos privados (`_compute_price_rule`,
//   `_get_product_price`, `_get_products_price`) con "Private methods cannot be
//   called remotely". El método público legacy `price_get` ya no existe. No queda
//   API remota para que Odoo devuelva el precio aplicado de una pricelist.
//   Solución: leemos las reglas (`product.pricelist.item`) y las aplicamos en JS.
//
// Cobertura:
// - Scope: applied_on '3_global' / '2_product_category' / '1_product' / '0_product_variant'
// - compute_price: 'fixed' / 'percentage' / 'formula'
// - base: 'list_price' / 'standard_price' / 'pricelist' (encadenada con base_pricelist_id)
// - Modificadores formula: price_discount, price_surcharge, price_round, price_min_margin, price_max_margin
// - Filtros: min_quantity, date_start, date_end

import { search_read } from './odoo.js';

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

// Aplica una regla a un producto, dada la `base` ya resuelta.
function applyRule(rule, base) {
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
      const step = rule.price_round || 0;
      if (step) price = Math.round(price / step) * step;
      if (rule.price_min_margin) price = Math.max(price, base + rule.price_min_margin);
      if (rule.price_max_margin) price = Math.min(price, base + rule.price_max_margin);
      break;
    }
  }
  return price;
}

// Encuentra la regla aplicable de una pricelist a un producto. null si no hay.
function pickRule(items, product, qty = 1) {
  // Orden: las reglas más específicas primero (la primera que matchee gana).
  const specificity = { '0_product_variant': 0, '1_product': 1, '2_product_category': 2, '3_global': 3 };
  const ordered = [...items].sort((a,b) => (specificity[a.applied_on] ?? 9) - (specificity[b.applied_on] ?? 9));
  return ordered.find(r => ruleMatches(r, product, qty)) || null;
}

// Resuelve el precio de un producto contra una pricelist. Soporta pricelists
// encadenadas (base='pricelist' con base_pricelist_id) con guardia anti-ciclos.
async function priceForProduct(pricelistId, product, qty = 1, visited = new Set()) {
  if (visited.has(pricelistId)) {
    console.warn('[pricing] ciclo de pricelists detectado en', pricelistId);
    return null;
  }
  visited.add(pricelistId);
  const items = await getPricelistItems(pricelistId);
  if (!items.length) return null;
  const rule = pickRule(items, product, qty);
  if (!rule) return null;

  // Resuelve la base
  let base;
  if (rule.base === 'standard_price') {
    base = product.standard_price ?? 0;
  } else if (rule.base === 'pricelist') {
    const childPlId = Array.isArray(rule.base_pricelist_id) ? rule.base_pricelist_id[0] : null;
    if (childPlId) {
      const childPrice = await priceForProduct(childPlId, product, qty, visited);
      base = childPrice ?? 0;
    } else {
      // Sin base_pricelist_id pese a base='pricelist' → fallback a list_price.
      base = product.list_price ?? 0;
    }
  } else {
    // 'list_price' o desconocido
    base = product.list_price ?? 0;
  }
  return applyRule(rule, base);
}

// Calcula precios aplicando la pricelist a una lista de product.product (variantIds).
// Devuelve Map<variantId, price>.
export async function computePrices(pricelistId, variantIds, partnerId = null) {
  const map = new Map();
  if (!pricelistId || !variantIds?.length) return map;
  try {
    const products = await search_read('product.product',
      [['id','in', variantIds]],
      ['id','product_tmpl_id','categ_id','standard_price','list_price'],
      { limit: variantIds.length });
    const normProducts = products.map(p => ({
      id: p.id,
      product_tmpl_id: Array.isArray(p.product_tmpl_id) ? p.product_tmpl_id[0] : p.product_tmpl_id,
      categ_id: Array.isArray(p.categ_id) ? p.categ_id[0] : p.categ_id,
      standard_price: p.standard_price || 0,
      list_price: p.list_price || 0,
    }));
    for (const p of normProducts) {
      const price = await priceForProduct(pricelistId, p, 1);
      if (typeof price === 'number') map.set(p.id, price);
    }
  } catch (e) {
    console.warn('[pricing] computePrices falló:', e.message);
  }
  return map;
}
