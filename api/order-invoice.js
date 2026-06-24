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
    ['name','message_main_attachment_id','state','move_type'], { limit: 1 });
  if (!inv.length) return null;
  // Saltamos facturas no posteadas (no tienen PDF generado todavía).
  if (inv[0].state && inv[0].state !== 'posted') return null;

  let attId   = inv[0].message_main_attachment_id?.[0] || null;
  let attName = (inv[0].name || `Factura-${invoiceId}`).replace('/', '-') + '.pdf';

  if (!attId) {
    // Fallback: cualquier PDF adjunto a este move.
    const atts = await search_read('ir.attachment',
      [
        ['res_model','=','account.move'],
        ['res_id','=', invoiceId],
        ['mimetype','=','application/pdf'],
      ],
      ['id','name'],
      { limit: 1, order: 'id desc' });
    if (atts.length) {
      attId   = atts[0].id;
      attName = atts[0].name || attName;
    }
  }

  if (!attId) {
    // Último intento: pedir a Odoo que renderice el PDF mediante el reporte
    // estándar de facturas (Odoo 14+ usa account.report_invoice_with_payments).
    try {
      const reportNames = ['account.account_invoices', 'account.report_invoice', 'account.report_invoice_with_payments'];
      for (const rn of reportNames) {
        try {
          const rendered = await call('ir.actions.report', '_render_qweb_pdf', [rn, [invoiceId]]);
          // _render_qweb_pdf devuelve [bytes, formato]. En JSON los bytes
          // pueden llegar como base64 string.
          if (Array.isArray(rendered) && rendered[0]) {
            const raw = rendered[0];
            const buf = Buffer.isBuffer(raw) ? raw
              : (typeof raw === 'string') ? Buffer.from(raw, 'base64')
              : null;
            if (buf && buf.length > 0) {
              return { buf, name: attName, mime: 'application/pdf' };
            }
          }
        } catch { /* probar siguiente nombre */ }
      }
    } catch { /* render no disponible */ }
    return null;
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
  if (!(await requireComercial(req, res))) return;
  const orderId = parseInt(req.query?.orderId, 10);
  if (!orderId) return res.status(400).json({ error: 'Falta orderId' });

  if (MOCK_MODE) return res.status(404).end();

  try {
    const orders = await search_read('sale.order', [['id','=', orderId]],
      ['name','invoice_ids'], { limit: 1 });
    if (!orders.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const invoiceIds = orders[0].invoice_ids || [];
    if (!invoiceIds.length) return res.status(404).json({ error: 'Sin factura emitida' });

    // Preferir facturas posteadas tipo out_invoice (no notas de abono) y más
    // recientes primero — útil cuando hay entregas parciales con varias
    // facturas y queremos la última emitida.
    const allInvoices = await search_read('account.move', [['id','in', invoiceIds]],
      ['id','move_type','state','invoice_date'], { limit: invoiceIds.length });
    const priority = (m) => (
      (m.move_type === 'out_invoice' ? 0 : 1) +
      (m.state === 'posted' ? 0 : 10)
    );
    const sorted = [...allInvoices].sort((a, b) => {
      const pa = priority(a), pb = priority(b);
      if (pa !== pb) return pa - pb;
      // Mismo nivel → más reciente primero.
      return String(b.invoice_date || '').localeCompare(String(a.invoice_date || ''));
    });

    // Probar las facturas en orden hasta encontrar una con PDF descargable.
    let pdf = null;
    for (const inv of sorted) {
      pdf = await fetchInvoicePdf(inv.id);
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
