// GET /api/order-invoice?orderId=ODOO_ID
// Devuelve el PDF de la factura asociada al pedido.
//
// Implementación: en lugar de invocar el render de Odoo (privado o que requiere
// sesión web con password real), leemos el PDF que Odoo adjunta automáticamente
// al postear la factura (account.move.message_main_attachment_id).
// Si no existe ese adjunto, fallback a buscar cualquier ir.attachment de
// mimetype application/pdf vinculado al move. Si tampoco hay nada, 404.

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

async function fetchInvoicePdf(invoiceId) {
  const inv = await search_read('account.move', [['id','=', invoiceId]],
    ['name','message_main_attachment_id'], { limit: 1 });
  if (!inv.length) return null;

  let attId   = inv[0].message_main_attachment_id?.[0] || null;
  let attName = (inv[0].name || `Factura-${invoiceId}`).replace('/', '-') + '.pdf';

  if (!attId) {
    const atts = await search_read('ir.attachment',
      [
        ['res_model','=','account.move'],
        ['res_id','=', invoiceId],
        ['mimetype','=','application/pdf'],
      ],
      ['id','name'],
      { limit: 1, order: 'id desc' });
    if (!atts.length) return null;
    attId   = atts[0].id;
    attName = atts[0].name || attName;
  }

  const data = await call('ir.attachment', 'read', [[attId], ['datas','mimetype','name']]);
  if (!data.length || !data[0].datas) return null;
  return {
    buf:  Buffer.from(data[0].datas, 'base64'),
    name: data[0].name || attName,
    mime: data[0].mimetype || 'application/pdf',
  };
}

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

    // Probar las facturas en orden hasta encontrar una con PDF adjunto.
    let pdf = null;
    for (const id of invoiceIds) {
      pdf = await fetchInvoicePdf(id);
      if (pdf) break;
    }
    if (!pdf) {
      return res.status(404).json({
        error: 'PDF no disponible. Abre la factura en Odoo y pulsa "Imprimir" para generarlo.',
      });
    }

    res.setHeader('Content-Type', pdf.mime);
    res.setHeader('Content-Disposition', `inline; filename="${pdf.name}"`);
    res.setHeader('Content-Length', String(pdf.buf.length));
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).end(pdf.buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
