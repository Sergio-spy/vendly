import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { CLIENTS } from './_lib/mock.js';
import { mapPartner } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;

  try {
    if (req.method === 'GET') {
      if (MOCK_MODE) return res.status(200).json(CLIENTS);

      // Filtrado por etiqueta del comercial. Si no tiene tag asignada, ve todos los clientes.
      const domain = [];
      if (c.odooTagId) domain.push(['category_id', 'in', [c.odooTagId]]);

      const fields = ['name','ref','vat','city','street','street2','phone','mobile','email',
        'credit','credit_limit','total_invoiced',
        'property_product_pricelist','property_payment_term_id'];
      const rows = await search_read('res.partner', domain, fields, { limit: 1000 });

      // Sobrescribimos `balance` para excluir asientos de apertura no conciliados
      // (migración del ERP anterior). Quedan así solo facturas pendientes reales.
      const balanceMap = await computeRealBalances(rows.map(r => r.id));
      const mapped = rows.map(r => {
        const m = mapPartner(r);
        if (balanceMap.has(r.id)) {
          const real = balanceMap.get(r.id);
          m.balance = real;
          m.status  = real > 0 ? 'pendiente' : 'al-dia';
        } else {
          // Sin apuntes abiertos → saldo real 0.
          m.balance = 0;
          m.status  = 'al-dia';
        }
        return m;
      });
      return res.status(200).json(mapped);
    }

    if (req.method === 'POST') {
      const { name, vat, ref, city, street, phone, pricelistId, paymentTermId } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Falta name' });
      if (MOCK_MODE) {
        return res.status(200).json({ id: 'C' + Math.floor(Math.random()*900+100) });
      }
      const vals = { name, customer_rank: 1 };
      if (vat != null)         vals.vat = vat;
      if (ref != null)         vals.ref = ref;
      if (city != null)        vals.city = city;
      if (street != null)      vals.street = street;
      if (phone != null)       vals.phone = phone;
      if (pricelistId)         vals.property_product_pricelist = pricelistId;
      if (paymentTermId)       vals.property_payment_term_id = paymentTermId;
      // Si el comercial tiene tag, etiqueta el cliente para que solo él lo vea.
      if (c.odooTagId)         vals.category_id = [[6, 0, [c.odooTagId]]];
      const odooId = await call('res.partner', 'create', [vals]);
      return res.status(200).json({ id: `C${String(odooId).padStart(2,'0')}`, odooId });
    }

    if (req.method === 'PUT') {
      const odooId = parseInt(req.body?.odooId, 10);
      if (!odooId) return res.status(400).json({ error: 'Falta odooId' });
      if (MOCK_MODE) return res.status(200).json({ ok: true });

      const { name, vat, ref, city, street, phone, pricelistId, paymentTermId } = req.body || {};
      const vals = {};
      if (name !== undefined)         vals.name = name;
      if (vat !== undefined)          vals.vat = vat;
      if (ref !== undefined)          vals.ref = ref;
      if (city !== undefined)         vals.city = city;
      if (street !== undefined)       vals.street = street;
      if (phone !== undefined)        vals.phone = phone;
      if (pricelistId !== undefined)  vals.property_product_pricelist = pricelistId || false;
      if (paymentTermId !== undefined) vals.property_payment_term_id = paymentTermId || false;

      if (Object.keys(vals).length === 0) return res.status(400).json({ error: 'Sin cambios' });
      await call('res.partner', 'write', [[odooId], vals]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Calcula el saldo real de los partners excluyendo asientos de apertura.
// Devuelve Map<partnerId, balance> en €.
const OPENING_RE = /apertura|opening/i;
async function computeRealBalances(partnerIds) {
  const map = new Map();
  if (!partnerIds.length) return map;
  const lines = await search_read('account.move.line',
    [
      ['partner_id','in', partnerIds],
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
    map.set(pid, (map.get(pid) || 0) + delta);
  }
  return map;
}
