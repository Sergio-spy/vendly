import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { CLIENTS } from './_lib/mock.js';
import { mapPartner } from './_lib/mappers.js';

export default async function handler(req, res) {
  try {
    if (MOCK_MODE) return res.status(200).json(CLIENTS);
    const fields = ['name','ref','vat','city','street','street2','phone','credit','credit_limit','total_invoiced','property_product_pricelist','property_payment_term_id'];
    const rows = await search_read('res.partner', [['customer_rank','>',0]], fields, { limit: 500 });
    res.status(200).json(rows.map(mapPartner));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
