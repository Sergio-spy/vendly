// GET /api/kpi?range=day|month
// Devuelve datos agregados para la pantalla "Mi rendimiento":
//   - series: [{label, total}] últimas 16 unidades del rango (16 días o 16 meses)
//   - average: media del rango
//   - max: mejor unidad
//   - topProducts: top 10 (sale.order.line) por importe del rango actual
// Filtrado por etiqueta del comercial (igual que /api/orders).

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

const RANGES = new Set(['day', 'month']);

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;

  const range = RANGES.has(req.query?.range) ? req.query.range : 'day';

  if (MOCK_MODE) {
    return res.status(200).json({ range, series: [], average: 0, max: 0, topProducts: [] });
  }

  try {
    // Ventana: últimos 16 días o 16 meses para la gráfica.
    const now = new Date();
    const start = new Date(now);
    if (range === 'day') start.setDate(start.getDate() - 30); // 30 días para tener historial
    else start.setMonth(start.getMonth() - 12);
    const startStr = start.toISOString().slice(0, 10);

    const orderDomain = [['date_order','>=', startStr]];
    if (c.odooTagId) orderDomain.push(['partner_id.category_id','in', [c.odooTagId]]);

    const orders = await search_read('sale.order', orderDomain,
      ['date_order','amount_untaxed','amount_total','state','order_line'],
      { limit: 1000, order: 'date_order desc' });

    // Solo pedidos confirmados o facturados — los borradores no son venta real.
    const valid = orders.filter(o => o.state !== 'draft' && o.state !== 'cancel');

    // Agrupar por día (YYYY-MM-DD) o mes (YYYY-MM).
    const buckets = new Map();
    for (const o of valid) {
      const key = (o.date_order || '').slice(0, range === 'day' ? 10 : 7);
      if (!key) continue;
      buckets.set(key, (buckets.get(key) || 0) + (o.amount_total || 0));
    }

    // Tomar las últimas 16 unidades (rellenando huecos con 0).
    const series = [];
    for (let i = 15; i >= 0; i--) {
      const d = new Date(now);
      let key, label;
      if (range === 'day') {
        d.setDate(d.getDate() - i);
        key = d.toISOString().slice(0, 10);
        label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      } else {
        d.setMonth(d.getMonth() - i);
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        label = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
      }
      series.push({ key, label, total: buckets.get(key) || 0 });
    }

    const totals = series.map(s => s.total);
    const average = totals.length ? totals.reduce((a,b)=>a+b,0) / totals.length : 0;
    const max = totals.length ? Math.max(...totals) : 0;

    // Top productos: agregamos cantidades e importes desde sale.order.line.
    // Solo del rango actual y solo de pedidos confirmados.
    const orderIds = valid.map(o => o.id);
    let topProducts = [];
    if (orderIds.length) {
      const lines = await search_read('sale.order.line',
        [['order_id','in', orderIds]],
        ['product_id','product_uom_qty','price_subtotal'],
        { limit: 5000 });
      const byProd = new Map();
      for (const l of lines) {
        const pid = Array.isArray(l.product_id) ? l.product_id[0] : l.product_id;
        const pname = l.product_id?.[1] || '';
        if (!pid) continue;
        const cur = byProd.get(pid) || { id: pid, name: pname, qty: 0, total: 0 };
        cur.qty   += l.product_uom_qty || 0;
        cur.total += l.price_subtotal || 0;
        byProd.set(pid, cur);
      }
      topProducts = [...byProd.values()].sort((a,b)=>b.total - a.total).slice(0, 10);
    }

    res.status(200).json({ range, series, average, max, topProducts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
