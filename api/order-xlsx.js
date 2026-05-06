// GET /api/order-xlsx?id=ODOO_ID — devuelve el Excel del pedido (cabecera +
// líneas + totales). Acepta `?token=` además del header Authorization.

import ExcelJS from 'exceljs';
import { search_read, MOCK_MODE } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';
import { COMPANY, FOOTER_LEGEND } from './_lib/company.js';

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
    const orders = await search_read('sale.order', [['id','=', id]],
      ['name','partner_id','date_order','amount_total','amount_untaxed','amount_tax',
       'state','client_order_ref','pricelist_id','note'], { limit: 1 });
    if (!orders.length) return res.status(404).json({ error: 'No encontrado' });
    const o = orders[0];

    let partner = null;
    if (o.partner_id) {
      const [p] = await search_read('res.partner', [['id','=', o.partner_id[0]]],
        ['name','vat','street','street2','city','zip','phone','email'], { limit: 1 });
      partner = p || null;
    }

    const lines = await search_read('sale.order.line', [['order_id','=', id]],
      ['product_id','name','product_uom_qty','price_unit','price_subtotal','discount']);

    const wb = new ExcelJS.Workbook();
    wb.creator = COMPANY.name;
    wb.created = new Date();
    const ws = wb.addWorksheet('Pedido', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // Anchos de columna
    ws.columns = [
      { width: 14 }, // A — etiquetas / Ref
      { width: 50 }, // B — descripción
      { width: 10 }, // C — cantidad
      { width: 14 }, // D — precio
      { width: 14 }, // E — subtotal
    ];

    // ── Cabecera Palomatic ──────────────────────────────────
    ws.mergeCells('A1:E1');
    ws.getCell('A1').value = COMPANY.name;
    ws.getCell('A1').font = { name: 'Calibri', bold: true, size: 16, color: { argb: 'FF222222' } };
    ws.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 22;

    ws.mergeCells('A2:E2');
    ws.getCell('A2').value = `NIF ${COMPANY.nif} · ${COMPANY.address} · ${COMPANY.city}`;
    ws.getCell('A2').font = { name: 'Calibri', size: 9, color: { argb: 'FF555555' } };

    ws.mergeCells('A3:E3');
    ws.getCell('A3').value = `Tel. ${COMPANY.phone} · ${COMPANY.email} · ${COMPANY.web}`;
    ws.getCell('A3').font = { name: 'Calibri', size: 9, color: { argb: 'FF555555' } };

    // Línea separadora
    ws.getRow(4).height = 4;

    // ── Datos del pedido ─────────────────────────────────────
    ws.mergeCells('A5:E5');
    ws.getCell('A5').value = `Pedido ${o.name || ''}`;
    ws.getCell('A5').font = { name: 'Calibri', bold: true, size: 14 };

    let row = 6;
    const setKV = (k, v) => {
      ws.getCell(`A${row}`).value = k;
      ws.getCell(`A${row}`).font = { bold: true, size: 10 };
      ws.mergeCells(`B${row}:E${row}`);
      ws.getCell(`B${row}`).value = v || '';
      ws.getCell(`B${row}`).font = { size: 10 };
      row++;
    };
    setKV('Fecha:',       fmtDate(o.date_order));
    setKV('Estado:',      STATE_LABEL[o.state] || o.state || '');
    if (o.client_order_ref) setKV('Ref. cliente:', o.client_order_ref);
    if (!hideTariff && o.pricelist_id?.[1]) setKV('Tarifa:', o.pricelist_id[1]);

    // ── Cliente ──────────────────────────────────────────────
    if (partner) {
      row++;
      ws.mergeCells(`A${row}:E${row}`);
      ws.getCell(`A${row}`).value = 'CLIENTE';
      ws.getCell(`A${row}`).font = { bold: true, size: 11, color: { argb: 'FF222222' } };
      row++;
      ws.mergeCells(`A${row}:E${row}`);
      ws.getCell(`A${row}`).value = partner.name || '';
      ws.getCell(`A${row}`).font = { bold: true, size: 11 };
      row++;
      const partnerLines = [
        partner.vat && `NIF: ${partner.vat}`,
        [partner.street, partner.street2].filter(Boolean).join(' · '),
        [partner.zip, partner.city].filter(Boolean).join(' '),
        [partner.phone && `Tel. ${partner.phone}`, partner.email].filter(Boolean).join(' · '),
      ].filter(Boolean);
      for (const l of partnerLines) {
        ws.mergeCells(`A${row}:E${row}`);
        ws.getCell(`A${row}`).value = l;
        ws.getCell(`A${row}`).font = { size: 10, color: { argb: 'FF333333' } };
        row++;
      }
    }
    row++; // gap

    // ── Tabla de líneas ──────────────────────────────────────
    const headerRow = row;
    const headers = ['Ref.', 'Descripción', 'Cant.', 'Precio', 'Subtotal'];
    headers.forEach((h, i) => {
      const cell = ws.getCell(headerRow, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF222222' } };
      cell.alignment = { horizontal: i === 0 || i === 1 ? 'left' : 'right', vertical: 'middle' };
      cell.border = { top:{style:'thin'}, bottom:{style:'thin'}, left:{style:'thin'}, right:{style:'thin'} };
    });
    row++;

    for (const l of lines) {
      const ref = l.product_id?.[1]?.match(/^\[([^\]]+)\]/)?.[1] || '';
      const name = (l.product_id?.[1] || l.name || '').replace(/^\[[^\]]+\]\s*/, '');
      const qty = l.product_uom_qty || 0;
      const price = l.price_unit || 0;
      const subtotal = l.price_subtotal || 0;

      ws.getCell(row, 1).value = ref;
      ws.getCell(row, 2).value = name;
      ws.getCell(row, 3).value = qty;
      ws.getCell(row, 4).value = price;
      ws.getCell(row, 5).value = subtotal;

      ws.getCell(row, 4).numFmt = '#,##0.0000 €';
      ws.getCell(row, 5).numFmt = '#,##0.00 €';
      for (let c = 1; c <= 5; c++) {
        ws.getCell(row, c).font = { size: 10 };
        ws.getCell(row, c).border = { bottom: { style: 'hair', color: { argb: 'FFE0E0E0' } } };
      }
      ws.getCell(row, 2).alignment = { wrapText: true, vertical: 'top' };
      row++;
    }

    // ── Totales ──────────────────────────────────────────────
    row++;
    const totalsRows = [
      ['Base imponible', o.amount_untaxed || 0],
      ['IVA',            o.amount_tax     || 0],
      ['TOTAL',          o.amount_total   || 0],
    ];
    for (const [label, value] of totalsRows) {
      ws.getCell(row, 4).value = label;
      ws.getCell(row, 5).value = value;
      ws.getCell(row, 4).alignment = { horizontal: 'right' };
      ws.getCell(row, 5).numFmt = '#,##0.00 €';
      ws.getCell(row, 4).font = { size: 10, bold: label === 'TOTAL' };
      ws.getCell(row, 5).font = { size: label === 'TOTAL' ? 12 : 10, bold: label === 'TOTAL' };
      if (label === 'TOTAL') {
        ws.getCell(row, 4).border = { top: { style: 'thin' } };
        ws.getCell(row, 5).border = { top: { style: 'thin' } };
      }
      row++;
    }

    // Notas
    if (o.note) {
      row += 2;
      ws.getCell(`A${row}`).value = 'Notas';
      ws.getCell(`A${row}`).font = { bold: true, size: 10 };
      row++;
      ws.mergeCells(`A${row}:E${row}`);
      ws.getCell(`A${row}`).value = String(o.note);
      ws.getCell(`A${row}`).font = { size: 9 };
      ws.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' };
      row++;
    }

    // Leyenda al pie
    row += 2;
    ws.mergeCells(`A${row}:E${row}`);
    ws.getCell(`A${row}`).value = FOOTER_LEGEND.join(' · ');
    ws.getCell(`A${row}`).font = { size: 8, color: { argb: 'FF888888' }, italic: true };
    ws.getCell(`A${row}`).alignment = { horizontal: 'center', wrapText: true };

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${(o.name || `pedido_${id}`).replace(/[^A-Za-z0-9_-]/g,'_')}.xlsx"`);
    res.status(200).send(Buffer.from(buf));
  } catch (e) {
    console.error('[order-xlsx] error:', e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
}
