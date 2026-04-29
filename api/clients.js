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

      const fields = ['name','ref','vat','city','street','street2','phone',
        'credit','credit_limit','total_invoiced',
        'property_product_pricelist','property_payment_term_id'];
      const rows = await search_read('res.partner', domain, fields, { limit: 1000 });
      return res.status(200).json(rows.map(mapPartner));
    }

    if (req.method === 'POST') {
      const { name, vat, city, street, phone } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Falta name' });
      if (MOCK_MODE) {
        return res.status(200).json({ id: 'C' + Math.floor(Math.random()*900+100) });
      }
      const vals = { name, vat, city, street, phone, customer_rank: 1 };
      // Si el comercial tiene tag, etiqueta el cliente para que solo él lo vea.
      if (c.odooTagId) vals.category_id = [[6, 0, [c.odooTagId]]];
      const odooId = await call('res.partner', 'create', [vals]);
      return res.status(200).json({ id: `C${String(odooId).padStart(2,'0')}`, odooId });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
