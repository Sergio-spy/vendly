// GET /api/order?id=ODOO_ID — detalle completo de un pedido (cabecera + líneas).

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { mapOrder } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;

  const id = parseInt(req.query?.id, 10);
  if (!id) return res.status(400).json({ error: 'Falta id' });

  try {
    if (MOCK_MODE) return res.status(200).json({ order: null, lines: [] });

    // Cabecera
    const orders = await search_read('sale.order', [['id','=', id]],
      ['name','partner_id','date_order','amount_total','amount_untaxed','amount_tax',
       'state','order_line','client_order_ref','pricelist_id','note']);
    if (!orders.length) return res.status(404).json({ error: 'No encontrado' });

    const o = orders[0];
    const orderMapped = mapOrder(o);

    // Líneas
    const lines = await search_read('sale.order.line', [['order_id','=', id]],
      ['product_id','name','product_uom_qty','price_unit','price_subtotal','discount']);

    res.status(200).json({
      order: {
        ...orderMapped,
        partnerName: o.partner_id?.[1] || '',
        pricelistName: o.pricelist_id?.[1] || '',
        ref: o.client_order_ref || '',
        amountUntaxed: o.amount_untaxed || 0,
        amountTax: o.amount_tax || 0,
      },
      lines: lines.map(l => ({
        odooId: l.id,
        productId: l.product_id?.[0] || null,
        productName: l.product_id?.[1] || l.name,
        description: l.name,
        qty: l.product_uom_qty || 0,
        price: l.price_unit || 0,
        discount: l.discount || 0,
        subtotal: l.price_subtotal || 0,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
