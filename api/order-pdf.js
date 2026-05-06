// GET /api/order-pdf?id=ODOO_ID — devuelve el PDF del pedido renderizado por
// nosotros con cabecera Palomatic, líneas y totales. Acepta `?token=` además
// del header Authorization para que se pueda usar como `<a href>` directo.

import PDFDocument from 'pdfkit';
import { search_read, MOCK_MODE } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';
import { COMPANY, FOOTER_LEGEND } from './_lib/company.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '_assets', 'palomatic_logo.png');

const eur = (n) => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' }).format(n || 0);
const fmtDate = (s) => (s || '').slice(0, 10).split('-').reverse().join('/');
const STATE_LABEL = {
  draft: 'Borrador', sent: 'Presupuesto enviado',
  sale: 'Confirmado', done: 'Cerrado', cancel: 'Cancelado',
};

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  const id = parseInt(req.query?.id, 10);
  if (!id) return res.status(400).json({ error: 'Falta id' });
  const hideTariff = !!c.portalPartnerId;
  if (MOCK_MODE) return res.status(503).json({ error: 'No disponible en modo mock' });

  try {
    // Cabecera del pedido
    const orders = await search_read('sale.order', [['id','=', id]],
      ['name','partner_id','date_order','amount_total','amount_untaxed','amount_tax',
       'state','client_order_ref','pricelist_id','note'], { limit: 1 });
    if (!orders.length) return res.status(404).json({ error: 'No encontrado' });
    const o = orders[0];

    // Datos del cliente
    let partner = null;
    if (o.partner_id) {
      const [p] = await search_read('res.partner', [['id','=', o.partner_id[0]]],
        ['name','vat','street','street2','city','zip','phone','email'], { limit: 1 });
      partner = p || null;
    }

    // Líneas
    const lines = await search_read('sale.order.line', [['order_id','=', id]],
      ['product_id','name','product_uom_qty','price_unit','price_subtotal','discount']);

    // Render PDF
    const doc = new PDFDocument({ size:'A4', margin: 40, info: { Title: o.name || `Pedido ${id}`, Author: COMPANY.name } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(o.name || `pedido_${id}`).replace(/[^A-Za-z0-9_-]/g,'_')}.pdf"`);
    doc.pipe(res);

    // ── Cabecera ──────────────────────────────────────────────────────
    if (fs.existsSync(LOGO_PATH)) {
      try { doc.image(LOGO_PATH, 40, 40, { width: 160 }); } catch {}
    }
    doc.fontSize(9).fillColor('#333').font('Helvetica');
    const headerRightX = 360;
    let y = 40;
    doc.font('Helvetica-Bold').fontSize(11).text(COMPANY.name, headerRightX, y, { width: 200, align:'right' });
    y += 14;
    doc.font('Helvetica').fontSize(9);
    doc.text(`NIF: ${COMPANY.nif}`,         headerRightX, y, { width: 200, align:'right' }); y += 11;
    doc.text(COMPANY.address,                headerRightX, y, { width: 200, align:'right' }); y += 11;
    doc.text(COMPANY.city,                   headerRightX, y, { width: 200, align:'right' }); y += 11;
    doc.text(`Tel. ${COMPANY.phone}`,        headerRightX, y, { width: 200, align:'right' }); y += 11;
    doc.text(`${COMPANY.email} · ${COMPANY.web}`, headerRightX, y, { width: 200, align:'right' });

    // Banda separadora
    doc.moveTo(40, 130).lineTo(555, 130).strokeColor('#222').lineWidth(1).stroke();

    // ── Datos del pedido ──────────────────────────────────────────────
    let cursorY = 145;
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000')
       .text(`Pedido ${o.name || ''}`, 40, cursorY);
    cursorY += 24;

    doc.fontSize(10).font('Helvetica').fillColor('#000');
    const col1X = 40, col2X = 300;
    const labelStyle = { width: 120 };
    const valueStyle = { width: 230 };

    doc.font('Helvetica-Bold').text('Fecha:', col1X, cursorY, labelStyle);
    doc.font('Helvetica').text(fmtDate(o.date_order), col1X + 60, cursorY, valueStyle);
    doc.font('Helvetica-Bold').text('Estado:', col2X, cursorY);
    doc.font('Helvetica').text(STATE_LABEL[o.state] || o.state || '', col2X + 60, cursorY);
    cursorY += 16;

    if (o.client_order_ref) {
      doc.font('Helvetica-Bold').text('Ref. cliente:', col1X, cursorY, labelStyle);
      doc.font('Helvetica').text(o.client_order_ref, col1X + 80, cursorY, valueStyle);
      cursorY += 16;
    }
    if (!hideTariff && o.pricelist_id?.[1]) {
      doc.font('Helvetica-Bold').text('Tarifa:', col1X, cursorY, labelStyle);
      doc.font('Helvetica').text(o.pricelist_id[1], col1X + 60, cursorY, valueStyle);
      cursorY += 16;
    }

    cursorY += 6;
    // Bloque cliente
    if (partner) {
      doc.moveTo(40, cursorY).lineTo(555, cursorY).strokeColor('#ddd').lineWidth(0.5).stroke();
      cursorY += 8;
      doc.font('Helvetica-Bold').fontSize(11).text('CLIENTE', 40, cursorY);
      cursorY += 16;
      doc.font('Helvetica-Bold').fontSize(11).text(partner.name || '', 40, cursorY);
      cursorY += 14;
      doc.font('Helvetica').fontSize(9).fillColor('#333');
      if (partner.vat)    { doc.text(`NIF: ${partner.vat}`, 40, cursorY); cursorY += 11; }
      const addr1 = [partner.street, partner.street2].filter(Boolean).join(' · ');
      if (addr1)          { doc.text(addr1, 40, cursorY); cursorY += 11; }
      const addr2 = [partner.zip, partner.city].filter(Boolean).join(' ');
      if (addr2)          { doc.text(addr2, 40, cursorY); cursorY += 11; }
      const contact = [partner.phone && `Tel. ${partner.phone}`, partner.email].filter(Boolean).join(' · ');
      if (contact)        { doc.text(contact, 40, cursorY); cursorY += 11; }
      doc.fillColor('#000');
      cursorY += 6;
    }

    // ── Tabla de líneas ───────────────────────────────────────────────
    cursorY += 4;
    const cols = {
      ref:   { x: 40,  w: 80,  label: 'Ref.' },
      desc:  { x: 125, w: 250, label: 'Descripción' },
      qty:   { x: 380, w: 40,  label: 'Cant.', align: 'right' },
      price: { x: 425, w: 60,  label: 'Precio',   align: 'right' },
      total: { x: 490, w: 65,  label: 'Subtotal', align: 'right' },
    };
    // Cabecera tabla
    doc.rect(40, cursorY, 515, 18).fillColor('#222').fill();
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
    Object.values(cols).forEach(c => doc.text(c.label, c.x + 4, cursorY + 5, { width: c.w - 8, align: c.align || 'left' }));
    doc.fillColor('#000').font('Helvetica').fontSize(9);
    cursorY += 22;

    const drawLine = (l) => {
      const ref = l.product_id?.[1]?.match(/^\[([^\]]+)\]/)?.[1] || '';
      const name = (l.product_id?.[1] || l.name || '').replace(/^\[[^\]]+\]\s*/, '');
      const qty = l.product_uom_qty || 0;
      const price = l.price_unit || 0;
      const subtotal = l.price_subtotal || 0;
      const startY = cursorY;
      doc.text(ref, cols.ref.x + 4, cursorY, { width: cols.ref.w - 8 });
      doc.text(name, cols.desc.x + 4, cursorY, { width: cols.desc.w - 8 });
      doc.text(String(qty), cols.qty.x + 4, cursorY, { width: cols.qty.w - 8, align:'right' });
      doc.text(eur(price), cols.price.x + 4, cursorY, { width: cols.price.w - 8, align:'right' });
      doc.text(eur(subtotal), cols.total.x + 4, cursorY, { width: cols.total.w - 8, align:'right' });
      // Calcula altura real ocupada por la celda más alta (descripción)
      const usedH = doc.heightOfString(name, { width: cols.desc.w - 8 });
      cursorY = startY + Math.max(14, usedH + 4);
      doc.moveTo(40, cursorY).lineTo(555, cursorY).strokeColor('#eee').lineWidth(0.4).stroke();
      cursorY += 4;
    };

    for (const l of lines) {
      // Salto de página si nos quedamos sin sitio para la siguiente línea + totales
      if (cursorY > 700) {
        doc.addPage();
        cursorY = 60;
      }
      drawLine(l);
    }

    // ── Totales ───────────────────────────────────────────────────────
    cursorY += 10;
    if (cursorY > 720) { doc.addPage(); cursorY = 60; }
    const totLabelX = 380, totValueX = 490;
    doc.font('Helvetica').fontSize(10);
    doc.text('Base imponible', totLabelX, cursorY); doc.text(eur(o.amount_untaxed), totValueX, cursorY, { width: 65, align:'right' });
    cursorY += 14;
    doc.text('IVA',            totLabelX, cursorY); doc.text(eur(o.amount_tax),     totValueX, cursorY, { width: 65, align:'right' });
    cursorY += 6;
    doc.moveTo(totLabelX, cursorY + 6).lineTo(555, cursorY + 6).strokeColor('#222').lineWidth(0.5).stroke();
    cursorY += 12;
    doc.font('Helvetica-Bold').fontSize(13);
    doc.text('TOTAL', totLabelX, cursorY); doc.text(eur(o.amount_total), totValueX, cursorY, { width: 65, align:'right' });

    // ── Notas + leyenda ───────────────────────────────────────────────
    if (o.note) {
      cursorY += 28;
      if (cursorY > 720) { doc.addPage(); cursorY = 60; }
      doc.font('Helvetica-Bold').fontSize(10).text('Notas', 40, cursorY); cursorY += 14;
      doc.font('Helvetica').fontSize(9).text(String(o.note), 40, cursorY, { width: 515 });
    }

    // Pie con leyenda — siempre al final de la última página
    doc.font('Helvetica').fontSize(7).fillColor('#666');
    const pageH = doc.page.height;
    const footY = pageH - 50;
    doc.text(FOOTER_LEGEND.join(' · '), 40, footY, { width: 515, align: 'center' });

    doc.end();
  } catch (e) {
    console.error('[order-pdf] error:', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
}
