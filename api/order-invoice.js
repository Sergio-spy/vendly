// GET /api/order-invoice?orderId=ODOO_ID
// Devuelve el PDF de la(s) factura(s) asociada(s) al pedido. Si todavía no hay
// factura emitida en Odoo, responde 404.
//
// Implementación: como Odoo bloquea ir.actions.report._render_qweb_pdf por
// JSON-RPC ("Private methods cannot be called remotely"), usamos el flujo HTTP
// estándar: 1) /web/session/authenticate con API key → cookie de sesión, 2)
// GET /report/pdf/<report>/<ids> con esa cookie → bytes del PDF.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

const REPORT_XMLID = 'account.account_invoices'; // template estándar de factura

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB  = process.env.ODOO_DB;
const ODOO_USER = process.env.ODOO_USER;
const ODOO_API_KEY = process.env.ODOO_API_KEY;

async function odooLogin() {
  const r = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_API_KEY },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(j.error.data?.message || j.error.message || 'Login fallido');
  if (!j.result?.uid) throw new Error('Sesión Odoo sin uid');
  // Concatenar todas las cookies que Odoo nos devuelva.
  const setCookie = r.headers.get('set-cookie') || '';
  const cookieHeader = setCookie
    .split(/,(?=\s*[A-Za-z0-9_-]+=)/) // coma seguida de nombre de cookie
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
  if (!cookieHeader) throw new Error('Odoo no devolvió cookie de sesión');
  return cookieHeader;
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

    const cookie = await odooLogin();
    const ids = invoiceIds.join(',');
    const reportUrl = `${ODOO_URL}/report/pdf/${REPORT_XMLID}/${ids}`;
    const pdfRes = await fetch(reportUrl, { headers: { Cookie: cookie } });
    if (!pdfRes.ok) {
      const text = await pdfRes.text().catch(() => '');
      return res.status(502).json({ error: `Odoo ${pdfRes.status}: ${text.slice(0, 180)}` });
    }
    const ct = pdfRes.headers.get('content-type') || '';
    const buf = Buffer.from(await pdfRes.arrayBuffer());
    if (!ct.includes('pdf') || buf.length < 100) {
      return res.status(502).json({ error: 'Respuesta no es PDF' });
    }

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
