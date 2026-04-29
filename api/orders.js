import { MOCK_MODE, search_read, create } from './_lib/odoo.js';
import { ORDERS } from './_lib/mock.js';
import { mapOrder } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;

  try {
    if (req.method === 'GET') {
      if (MOCK_MODE) return res.status(200).json(ORDERS);

      // Filtramos los pedidos por los clientes etiquetados con el tag del comercial.
      // (En Odoo, partner_id.category_id permite navegación relacional en el dominio.)
      const domain = [];
      if (c.odooTagId) domain.push(['partner_id.category_id', 'in', [c.odooTagId]]);

      const rows = await search_read('sale.order', domain,
        ['name','partner_id','date_order','amount_total','state','order_line'],
        { limit: 200, order: 'date_order desc' });
      return res.status(200).json(rows.map(mapOrder));
    }

    if (req.method === 'POST') {
      const { partnerId, lines, pricelistId } = req.body || {};
      if (MOCK_MODE) {
        const id = 'PD-' + Math.floor(Date.now()/1000).toString().slice(-7);
        return res.status(200).json({ id, status: 'borrador' });
      }
      const orderId = await create('sale.order', {
        partner_id: partnerId,
        pricelist_id: pricelistId || undefined,
        order_line: lines.map(l => [0, 0, { product_id: l.productId, product_uom_qty: l.qty }]),
      });
      return res.status(200).json({ id: orderId });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
