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
        ['name','partner_id','date_order','amount_total','state','invoice_status','order_line','invoice_ids'],
        { limit: 200, order: 'date_order desc' });
      return res.status(200).json(rows.map(mapOrder));
    }

    if (req.method === 'POST') {
      const { partnerId, lines, pricelistId } = req.body || {};
      if (!partnerId) return res.status(400).json({ error: 'Falta partnerId' });
      if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'Faltan líneas' });

      if (MOCK_MODE) {
        const id = 'PD-' + Math.floor(Date.now()/1000).toString().slice(-7);
        return res.status(200).json({ id, status: 'borrador' });
      }

      const cleanLines = lines.filter(l => l.productId && l.qty > 0);
      if (cleanLines.length === 0) return res.status(400).json({ error: 'Líneas inválidas' });

      const orderId = await create('sale.order', {
        partner_id: partnerId,
        pricelist_id: pricelistId || undefined,
        order_line: cleanLines.map(l => [0, 0, { product_id: l.productId, product_uom_qty: l.qty }]),
      });

      // Nota interna en el chatter del pedido para trazabilidad del comercial real
      // (los comerciales no son usuarios Odoo, así que esto deja huella visible).
      try {
        const body = `Pedido creado vía <b>Vendly</b> por <b>${c.name}</b> (${c.email || c.id})`;
        await call('sale.order', 'message_post', [[orderId]], {
          body,
          message_type: 'comment',
          subtype_xmlid: 'mail.mt_note',
        });
      } catch (e) {
        // Si la nota falla, no rompemos la creación del pedido.
        console.warn('[orders] message_post failed:', e.message);
      }

      // Devolvemos también el "name" del pedido (ej. S00176) para feedback inmediato
      const [created] = await search_read('sale.order', [['id','=', orderId]], ['name','state']);
      return res.status(200).json({ odooId: orderId, id: created?.name, status: created?.state });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
