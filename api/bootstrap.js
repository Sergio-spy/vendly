// GET /api/bootstrap — TODOS los datos de arranque en una única Function:
//   { health, products, clients, tariffs, promos, orders, families }
// Resuelve el problema de cold-start múltiple en Vercel: en vez de 7 lambdas
// arrancando en frío y autenticándose contra Odoo en paralelo (lo que tira
// alguna), aquí solo hay una lambda y una autenticación; las queries Odoo se
// lanzan en paralelo dentro de la misma Function reusando el uid cacheado.
// Si Odoo está caído, devuelve 200 con campos vacíos y un odooAuth='fail' en
// health, para que el frontend no caiga al estado "Error cargando la API".

import { MOCK_MODE, search_read, pingAuth } from './_lib/odoo.js';
import { CLIENTS, ORDERS, PRODUCTS, PROMOS, TARIFFS } from './_lib/mock.js';
import { mapOrder, mapPartner, mapPricelist, mapTemplate } from './_lib/mappers.js';
import { resolveFamilies } from './_lib/families.js';
import { requireComercial } from './_lib/auth.js';

const OPENING_RE = /apertura|opening/i;

export default async function handler(req, res) {
  const c = requireComercial(req, res);
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

    // 2) En paralelo: el resto de queries (todas reusan el uid ya cacheado).
    const productDomain = [['sale_ok','=',true]];
    if (familyIds.length) productDomain.push(['categ_id','in', familyIds]);
    if (palosCategIds.size) {
      productDomain.push('|',
        ['categ_id','not in', [...palosCategIds]],
        ['name','ilike','agujero']);
    }

    const clientDomain = [];
    if (c.odooTagId) clientDomain.push(['category_id', 'in', [c.odooTagId]]);

    const orderDomain = [];
    if (c.odooTagId) orderDomain.push(['partner_id.category_id', 'in', [c.odooTagId]]);

    const productCountsDomain = [['sale_ok','=',true]];

    const [
      productRows, clientRows, tariffRows, orderRows, productCountRows, odooAuth,
    ] = await Promise.all([
      search_read('product.template', productDomain, [
        'name','default_code','barcode','list_price','qty_available','categ_id',
        'product_variant_count','product_variant_ids',
      ], { limit: 1000 }),
      search_read('res.partner', clientDomain, [
        'name','ref','vat','city','street','street2','phone',
        'credit','credit_limit','total_invoiced',
        'property_product_pricelist','property_payment_term_id',
      ], { limit: 1000 }),
      search_read('product.pricelist', [['name','=ilike','Comercial%']],
        ['name','currency_id'], { limit: 50 }),
      search_read('sale.order', orderDomain,
        ['name','partner_id','date_order','amount_total','state','order_line'],
        { limit: 200, order: 'date_order desc' }),
      search_read('product.product', productCountsDomain, ['categ_id'], { limit: 5000 }),
      pingAuth().catch(() => false),
    ]);

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
        ['partner_id','debit','credit','ref','name','move_name'],
        { limit: 5000 });
      for (const l of lines) {
        if (OPENING_RE.test(l.ref || '') || OPENING_RE.test(l.name || '') || OPENING_RE.test(l.move_name || '')) continue;
        const pid = Array.isArray(l.partner_id) ? l.partner_id[0] : l.partner_id;
        const delta = (l.debit || 0) - (l.credit || 0);
        balanceMap.set(pid, (balanceMap.get(pid) || 0) + delta);
      }
    }

    // Mapeos finales.
    const products = productRows.map(r => {
      const m = mapTemplate(r);
      if (palosCategIds.has(r.categ_id?.[0]) && m.variantIds?.length) {
        m.variantCount = 1;
        m.odooId = m.variantIds[0];
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
    const orders  = orderRows.map(mapOrder);
    const promos  = PROMOS; // hasta que se lea de loyalty.program

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
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
