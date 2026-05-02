// GET /api/admin-kpi (admin only)
// Devuelve KPIs agregados por comercial:
//   { comerciales: [{ id, name, odooTagId, monthRevenue, monthOrders, activeClients, balance, goal:{monthly,yearly} }] }
// Para que el admin pueda comparar el rendimiento de cada comercial vs su objetivo.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { loadComerciales } from './_lib/comerciales.js';
import { kvGet } from './_lib/kv.js';
import { requireComercial } from './_lib/auth.js';

const OPENING_RE = /apertura|opening/i;

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  if (MOCK_MODE) return res.status(200).json({ comerciales: [] });

  try {
    // Mes a analizar: ?month=YYYY-MM (default = mes actual).
    const monthArg = (req.query?.month || '').slice(0, 7);
    const ymNow = /^\d{4}-\d{2}$/.test(monthArg) ? monthArg : new Date().toISOString().slice(0, 7);
    const monthStart = `${ymNow}-01`;
    // Fin de mes: primer día del mes siguiente.
    const [yy, mm] = ymNow.split('-').map(Number);
    const nextMonth = new Date(Date.UTC(yy, mm, 1)); // mm es 1-based, así que +1 ya implícito
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    const all = await loadComerciales();
    const comercialesActivos = all.filter(c => c.role === 'comercial' && c.odooTagId);
    const tagIds = comercialesActivos.map(c => c.odooTagId);

    if (!tagIds.length) return res.status(200).json({ comerciales: [] });

    // Datos en paralelo: pedidos del mes + clientes (con saldo y tags) + goals.
    const [orderRows, clientRows, allGoals] = await Promise.all([
      search_read('sale.order',
        [['date_order','>=', monthStart], ['date_order','<', monthEnd], ['partner_id.category_id', 'in', tagIds]],
        ['partner_id','date_order','amount_total','state','invoice_status'],
        { limit: 5000, order: 'date_order desc' }),
      search_read('res.partner',
        [['category_id','in', tagIds]],
        ['name','category_id','credit'],
        { limit: 5000 }),
      kvGet('goals').catch(() => null),
    ]);

    // Saldo real sin asientos de apertura. Recorremos TODOS los apuntes
    // abiertos de los clientes con tag de comercial (no solo los con credit>0,
    // porque algunos apuntes pueden estar en cuentas a cobrar distintas).
    const allPartnerIds = clientRows.map(p => p.id);
    const balanceMap = new Map();
    if (allPartnerIds.length) {
      const lines = await search_read('account.move.line',
        [
          ['partner_id','in', allPartnerIds],
          ['account_id.account_type','=','asset_receivable'],
          ['reconciled','=', false],
          ['parent_state','=','posted'],
        ],
        ['partner_id','debit','credit','amount_residual','ref','name','move_name'],
        { limit: 20000 });
      for (const l of lines) {
        if (OPENING_RE.test(l.ref || '') || OPENING_RE.test(l.name || '') || OPENING_RE.test(l.move_name || '')) continue;
        const pid = Array.isArray(l.partner_id) ? l.partner_id[0] : l.partner_id;
        const delta = l.amount_residual ?? ((l.debit || 0) - (l.credit || 0));
        balanceMap.set(pid, (balanceMap.get(pid) || 0) + delta);
      }
    }

    // Cada partner se asigna al primer comercial cuya tag coincida (un partner
    // con varias tags comerciales no se cuenta varias veces en la suma global).
    const partnerComercial = new Map(); // partnerId → comercialId
    for (const p of clientRows) {
      for (const tagId of (p.category_id || [])) {
        const co = comercialesActivos.find(c => c.odooTagId === tagId);
        if (co) { partnerComercial.set(p.id, co.id); break; }
      }
    }

    const out = comercialesActivos.map(co => {
      const goal = (allGoals && allGoals[co.id]) || {};
      const myPartnerIds = new Set(
        [...partnerComercial.entries()].filter(([, cid]) => cid === co.id).map(([pid]) => pid)
      );

      const ordersMine = orderRows.filter(o => {
        const pid = Array.isArray(o.partner_id) ? o.partner_id[0] : o.partner_id;
        return myPartnerIds.has(pid) && o.state !== 'draft' && o.state !== 'cancel';
      });
      const monthRevenue = ordersMine.reduce((a,o) => a + (o.amount_total || 0), 0);
      const monthOrders  = ordersMine.length;
      const activeClients = new Set(
        ordersMine.map(o => Array.isArray(o.partner_id) ? o.partner_id[0] : o.partner_id)
      ).size;
      const balance = [...myPartnerIds].reduce((a, pid) => a + (balanceMap.get(pid) || 0), 0);

      return {
        id:            co.id,
        name:          co.name,
        odooTagId:     co.odooTagId,
        monthRevenue,
        monthOrders,
        clients:       myPartnerIds.size,
        activeClients,
        balance,
        goal:          { monthly: goal.monthly || 0, yearly: goal.yearly || 0 },
      };
    });

    res.status(200).json({ comerciales: out, month: ymNow });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
