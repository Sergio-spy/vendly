// GET /api/bootstrap — TODOS los datos de arranque en una única Function:
//   { health, products, clients, tariffs, promos, orders, families }
// Resuelve el problema de cold-start múltiple en Vercel: en vez de 7 lambdas
// arrancando en frío y autenticándose contra Odoo en paralelo (lo que tira
// alguna), aquí solo hay una lambda y una autenticación; las queries Odoo se
// lanzan en paralelo dentro de la misma Function reusando el uid cacheado.
// Si Odoo está caído, devuelve 200 con campos vacíos y un odooAuth='fail' en
// health, para que el frontend no caiga al estado "Error cargando la API".

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { CLIENTS, ORDERS, PRODUCTS, PROMOS, TARIFFS } from './_lib/mock.js';
import { mapOrder, mapPartner, mapPricelist, mapTemplate } from './_lib/mappers.js';
import { attachDeliveryStatus } from './_lib/orders.js';
import { resolveFamilies } from './_lib/families.js';
import { kvGet } from './_lib/kv.js';
import { requireComercial } from './_lib/auth.js';
import { resolvePricelistId, computePrices, COMERCIAL_PVP_MARKUP_FOR_SALES } from './_lib/pricing.js';

const OPENING_RE = /apertura|opening/i;

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;

  const expiresAt = process.env.ODOO_API_KEY_EXPIRES_AT || null;
  let apiKeyDaysLeft = null;
  if (expiresAt) {
    const ms = new Date(expiresAt + 'T00:00:00Z').getTime() - Date.now();
    apiKeyDaysLeft = Math.floor(ms / 86_400_000);
  }

  // Modo mock: respuesta instantánea con los fixtures.
  if (MOCK_MODE) {
    return res.status(200).json({
      health: { ok: true, mode: 'mock', odooAuth: null, apiKeyExpiresAt: expiresAt, apiKeyDaysLeft },
      products: PRODUCTS, clients: CLIENTS, tariffs: TARIFFS, promos: PROMOS, orders: ORDERS, families: [],
    });
  }

  try {
    // 1) Resolvemos categorías Odoo (las usan products + families).
    const cats = await search_read('product.category', [],
      ['name','complete_name','parent_id'], { limit: 500 });
    const fams = resolveFamilies(cats).filter(f => f.odooId != null);
    const familyIds = fams.map(f => f.odooId);
    const palosCategIds = new Set(
      fams.filter(f => f.key.startsWith('Palos Aluminio')).map(f => f.odooId)
    );
    // El filtro 'agujero' no aplica a la subcategoría Anodizado (los anodizados
    // se muestran todos, no solo los que tienen 'agujero' en el nombre).
    const palosAgujeroCategIds = new Set(
      fams.filter(f => f.key.startsWith('Palos Aluminio/') && !f.key.includes('Anodizado'))
          .map(f => f.odooId)
    );

    // 2) En paralelo: el resto de queries (todas reusan el uid ya cacheado).
    const productDomain = [['sale_ok','=',true]];
    if (familyIds.length) productDomain.push(['categ_id','in', familyIds]);
    if (palosAgujeroCategIds.size) {
      productDomain.push('|',
        ['categ_id','not in', [...palosAgujeroCategIds]],
        ['name','ilike','agujero']);
    }

    const clientDomain = [];
    if (c.odooTagId) clientDomain.push(['category_id', 'in', [c.odooTagId]]);
    else if (c.role === 'admin') clientDomain.push(['category_id.name', '=ilike', 'Comercial%']);

    const orderDomain = [];
    if (c.odooTagId) orderDomain.push(['partner_id.category_id', 'in', [c.odooTagId]]);
    else if (c.role === 'admin') orderDomain.push(['partner_id.category_id.name', '=ilike', 'Comercial%']);

    const productCountsDomain = [['sale_ok','=',true]];

    const [
      productRows, clientRows, tariffRows, orderRows, productCountRows, promoRowsRaw,
    ] = await Promise.all([
      search_read('product.template', productDomain, [
        'name','default_code','barcode','x_studio_referencia',
        'list_price','qty_available','categ_id',
        'product_variant_count','product_variant_ids',
      ], { limit: 1000 }),
      search_read('res.partner', clientDomain, [
        'name','ref','vat','city','street','street2','phone','email',
        'credit','credit_limit','total_invoiced',
        'property_product_pricelist','property_payment_term_id','category_id',
      ], { limit: 1000 }),
      search_read('product.pricelist', [['name','=ilike','Comercial%']],
        ['name','currency_id'], { limit: 50 }),
      search_read('sale.order', orderDomain,
        ['name','partner_id','date_order','amount_total','state','invoice_status','order_line','invoice_ids','picking_ids'],
        { limit: 200, order: 'date_order desc' }),
      search_read('product.product', productCountsDomain, ['categ_id'], { limit: 5000 }),
      // loyalty.program — solo activos para el listado público.
      search_read('loyalty.program', [['active','=', true]],
        ['name','program_type','date_from','date_to','reward_ids','rule_ids','coupon_count'],
        { limit: 200 }).catch(() => []),
    ]);
    // Si las queries arriba funcionaron, la auth a Odoo está OK.
    const odooAuth = true;

    // Conteo por categoría.
    const counts = new Map();
    for (const g of productCountRows) {
      const id = Array.isArray(g.categ_id) ? g.categ_id[0] : g.categ_id;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    const families = resolveFamilies(cats, counts);

    // Saldos reales (excluyendo asientos de apertura) — solo si hay clientes con credit > 0.
    const partnerIdsWithCredit = clientRows.filter(p => (p.credit || 0) > 0).map(p => p.id);
    const balanceMap = new Map();
    if (partnerIdsWithCredit.length) {
      const lines = await search_read('account.move.line',
        [
          ['partner_id','in', partnerIdsWithCredit],
          ['account_id.account_type','=','asset_receivable'],
          ['reconciled','=', false],
          ['parent_state','=','posted'],
        ],
        ['partner_id','debit','credit','amount_residual','ref','name','move_name'],
        { limit: 5000 });
      for (const l of lines) {
        if (OPENING_RE.test(l.ref || '') || OPENING_RE.test(l.name || '') || OPENING_RE.test(l.move_name || '')) continue;
        const pid = Array.isArray(l.partner_id) ? l.partner_id[0] : l.partner_id;
        const delta = l.amount_residual ?? ((l.debit || 0) - (l.credit || 0));
        balanceMap.set(pid, (balanceMap.get(pid) || 0) + delta);
      }
    }

    // Precios con la tarifa por defecto "Comercial PVP" (sin cliente al arrancar).
    // Y aprovechamos para rellenar SKU/EAN desde la primera variante cuando el
    // template los tiene vacíos (Odoo a veces los define solo a nivel variante).
    const variantByTemplate = new Map();
    for (const r of productRows) {
      const vId = (r.product_variant_ids || [])[0];
      if (vId) variantByTemplate.set(r.id, vId);
    }
    const variantIds = [...variantByTemplate.values()];
    const defaultPricelistId = await resolvePricelistId(null);
    // En bootstrap siempre se usa Comercial PVP (sin cliente). Si el usuario
    // no es admin, se aplica el recargo de visualización del 15%.
    const markup = c.role !== 'admin' ? COMERCIAL_PVP_MARKUP_FOR_SALES : 1;
    const [priceByVariant, variantInfoRows] = await Promise.all([
      computePrices(defaultPricelistId, variantIds, null),
      variantIds.length
        ? search_read('product.product',
            [['id','in', variantIds]],
            ['id','default_code','barcode','x_studio_referencia'],
            { limit: variantIds.length })
        : Promise.resolve([]),
    ]);
    const variantInfoById = new Map(variantInfoRows.map(v => [v.id, v]));

    // Mapeos finales.
    const products = productRows.map(r => {
      const m = mapTemplate(r);
      if (palosCategIds.has(r.categ_id?.[0]) && m.variantIds?.length) {
        m.variantCount = 1;
        m.odooId = m.variantIds[0];
      }
      const vId = variantByTemplate.get(r.id);
      if (vId) {
        if (priceByVariant.has(vId)) m.pvp = priceByVariant.get(vId) * markup;
        const v = variantInfoById.get(vId);
        if (v) {
          if (!m.sku) m.sku = v.x_studio_referencia || v.default_code || '';
          if (!m.ean && v.barcode) m.ean = v.barcode;
        }
      }
      return m;
    });

    const clients = clientRows.map(r => {
      const m = mapPartner(r);
      const real = balanceMap.has(r.id) ? balanceMap.get(r.id) : 0;
      m.balance = real;
      m.status  = real > 0 ? 'pendiente' : 'al-dia';
      return m;
    });

    const tariffs = tariffRows.map(mapPricelist);
    await attachDeliveryStatus(orderRows);
    const orders  = orderRows.map(mapOrder);
    const promos  = (promoRowsRaw || []).map(p => ({
      id:        `P${p.id}`,
      odooId:    p.id,
      title:     p.name || '',
      kind:      p.program_type || '',
      end:       (p.date_to   || '').slice(0,10),
      start:     (p.date_from || '').slice(0,10),
      stock:     p.coupon_count || 0,
      sku:       null,
      active:    true,
    }));

    // Objetivo del comercial logueado (Vercel KV).
    let myGoal = null;
    try {
      const all = await kvGet('goals');
      if (all && all[c.id]) myGoal = all[c.id];
    } catch {}

    res.status(200).json({
      health: {
        ok: true,
        mode: 'odoo',
        odooUrl: process.env.ODOO_URL || null,
        odooDb:  process.env.ODOO_DB || null,
        odooAuth: odooAuth ? 'ok' : 'fail',
        apiKeyExpiresAt: expiresAt,
        apiKeyDaysLeft,
        time: new Date().toISOString(),
      },
      products, clients, tariffs, promos, orders, families,
      myGoal,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
