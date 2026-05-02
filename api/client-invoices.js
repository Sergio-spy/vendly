// GET /api/client-invoices?id=PARTNER_ODOO_ID
// Devuelve los apuntes a cobrar abiertos del cliente (los que componen el
// "saldo pendiente"), excluyendo asientos de apertura. Una línea por factura
// pendiente o pago parcial pendiente.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

const OPENING_RE = /apertura|opening/i;

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;

  const id = parseInt(req.query?.id, 10);
  if (!id) return res.status(400).json({ error: 'Falta id' });

  if (MOCK_MODE) return res.status(200).json({ lines: [] });

  try {
    const lines = await search_read('account.move.line',
      [
        ['partner_id','=', id],
        ['account_id.account_type','=','asset_receivable'],
        ['reconciled','=', false],
        ['parent_state','=','posted'],
      ],
      ['move_id','move_name','date','date_maturity','debit','credit','amount_residual','ref','name','journal_id'],
      { limit: 500, order: 'date_maturity asc, date asc' });

    const today = new Date().toISOString().slice(0, 10);
    const filtered = lines
      .filter(l => !(OPENING_RE.test(l.ref || '') || OPENING_RE.test(l.name || '') || OPENING_RE.test(l.move_name || '')))
      .map(l => {
        const due = l.date_maturity || '';
        const overdueDays = due && due < today ? Math.floor((Date.parse(today) - Date.parse(due)) / 86_400_000) : 0;
        return {
          moveId:    l.move_id?.[0] || null,
          moveName:  l.move_name || l.move_id?.[1] || '',
          date:      l.date || '',
          dueDate:   due,
          residual:  l.amount_residual ?? ((l.debit || 0) - (l.credit || 0)),
          total:     (l.debit || 0) - (l.credit || 0),
          overdueDays,
          journal:   l.journal_id?.[1] || '',
          ref:       l.ref || '',
        };
      });

    res.status(200).json({ lines: filtered });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
