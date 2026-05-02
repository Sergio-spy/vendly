// GET /api/order-invoice?orderId=ODOO_ID
// Devuelve el PDF de la(s) factura(s) asociada(s) al pedido. Si todavía no hay
// factura emitida en Odoo, responde 404. Para "previsualizar" en navegador o
// descargar desde un <a download>, se pasa el token en query.

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

const REPORT_XMLID = 'account.account_invoices'; // template estándar de factura

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  const orderId = parseInt(req.query?.orderId, 10);
  if (!orderId) return res.status(400).json({ error: 'Falta orderId' });

  if (MOCK_MODE) return res.status(404).end();

  try {
    const orders = await search_read('sale.order', [['id','=', orderId]],
      ['name','invoice_ids'], { limit: 1 });
    if (!orders.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const invoiceIds = orders[0].invoice_ids || [];
    if (!invoiceIds.length) return res.status(404).json({ error: 'Sin factura emitida' });

    // Renderizar el PDF. _render_qweb_pdf devuelve [bytes_b64, 'pdf'].
    const result = await call('ir.actions.report', '_render_qweb_pdf', [REPORT_XMLID, invoiceIds]);
    const b64 = Array.isArray(result) ? result[0] : null;
    if (!b64) return res.status(500).json({ error: 'Render PDF vacío' });

    const buf = Buffer.from(b64, 'base64');
    const filename = `Factura-${orders[0].name || orderId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).end(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
