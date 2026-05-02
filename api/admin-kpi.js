// GET /api/admin-kpi (admin only)
// Devuelve KPIs agregados por comercial:
//   { comerciales: [{ id, name, odooTagId, monthRevenue, monthOrders, activeClients, balance, goal:{monthly,yearly} }] }
// Para que el admin pueda comparar el rendimiento de cada comercial vs su objetivo.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { COMERCIALES } from './_lib/comerciales.js';
import { kvGet } from './_lib/kv.js';
import { requireComercial } from './_lib/auth.js';

const OPENING_RE = /apertura|opening/i;

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  if (MOCK_MODE) return res.status(200).json({ comerciales: [] });

  try {
    const ymNow = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const monthStart = `${ymNow}-01`;

    const comercialesActivos = COMERCIALES.filter(c => c.role === 'comercial' && c.odooTagId);
    const tagIds = comercialesActivos.map(c => c.odooTagId);

    if (!tagIds.length) return res.status(200).json({ comerciales: [] });

    // Datos en paralelo: pedidos del mes + clientes (con saldo y tags) + goals.
    const [orderRows, clientRows, allGoals] = await Promise.all([
      search_read('sale.order',
        [['date_order','>=', monthStart], ['partner_id.category_id', 'in', tagIds]],
        ['partner_id','date_order','amount_total','state','invoice_status'],
        { limit: 5000, order: 'date_order desc' }),
      search_read('res.partner',
        [['category_id','in', tagIds]],
        ['name','category_id','credit'],
        { limit: 5000 }),
      kvGet('goals').catch(() => null),
    ]);

    // Para los clientes con credit > 0, recalcular balance real (sin asientos de apertura).
    const partnersWithCredit = clientRows.filter(p => (p.credit || 0) > 0).map(p => p.id);
    const balanceMap = new Map();
    if (partnersWithCredit.length) {
      const lines = await search_read('account.move.line',
        [
          ['partner_id','in', partnersWithCredit],
          ['account_id.account_type','=','asset_receivable'],
          ['reconciled','=', false],
          ['parent_state','=','posted'],
        ],
        ['partner_id','debit','credit','ref','name','move_name'],
        { limit: 10000 });
      for (const l of lines) {
        if (OPENING_RE.test(l.ref || '') || OPENING_RE.test(l.name || '') || OPENING_RE.test(l.move_name || '')) continue;
        const pid = Array.isArray(l.partner_id) ? l.partner_id[0] : l.partner_id;
        const delta = (l.debit || 0) - (l.credit || 0);
        balanceMap.set(pid, (balanceMap.get(pid) || 0) + delta);
      }
    }

    // Mapeo: para cada partner, lista de tag ids
    const partnerTags = new Map(); // partnerId → Set(tagIds)
    for (const p of clientRows) {
      partnerTags.set(p.id, new Set(p.category_id || []));
    }

    const out = comercialesActivos.map(co => {
      const goal = (allGoals && allGoals[co.id]) || {};
      const tagId = co.odooTagId;
      // Pedidos del mes con este tag.
      const ordersMine = orderRows.filter(o => {
        const partnerId = Array.isArray(o.partner_id) ? o.partner_id[0] : o.partner_id;
        const tags = partnerTags.get(partnerId);
        return tags && tags.has(tagId) && o.state !== 'draft' && o.state !== 'cancel';
      });
      const monthRevenue = ordersMine.reduce((a,o) => a + (o.amount_total || 0), 0);
      const monthOrders  = ordersMine.length;

      const clientsMine = clientRows.filter(p => (p.category_id || []).includes(tagId));
      const activeClients = new Set(ordersMine.map(o => Array.isArray(o.partner_id) ? o.partner_id[0] : o.partner_id)).size;
      const balance = clientsMine.reduce((a,p) => a + (balanceMap.get(p.id) || 0), 0);

      return {
        id:            co.id,
        name:          co.name,
        odooTagId:     co.odooTagId,
        monthRevenue,
        monthOrders,
        clients:       clientsMine.length,
        activeClients,
        balance,
        goal:          { monthly: goal.monthly || 0, yearly: goal.yearly || 0 },
      };
    });

    res.status(200).json({ comerciales: out });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
