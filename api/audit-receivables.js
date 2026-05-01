// GET /api/audit-receivables
// Para cada cliente con saldo (credit > 0) en Odoo, lista los apuntes de
// cuenta a cobrar abiertos y separa los que son "asiento de apertura" del
// resto. Sirve para validar la corrección del saldo antes de aplicarla.

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

const OPENING_KEYWORDS = /apertura|opening/i;

export default async function handler(req, res) {
  const c = requireComercial(req, res);
  if (!c) return;
  if (MOCK_MODE) return res.status(200).json({ rows: [], summary: {} });

  try {
    // Solo clientes asignados a algún comercial (etiqueta empezando por "Comercial").
    const partnerDomain = [
      ['credit','>', 0],
      ['category_id.name','=ilike','Comercial%'],
    ];
    if (c.odooTagId) partnerDomain.push(['category_id','in', [c.odooTagId]]);

    const partners = await search_read('res.partner', partnerDomain,
      ['name','ref','credit'], { limit: 1000 });
    if (!partners.length) return res.status(200).json({ rows: [], summary: { partners: 0 } });

    const partnerIds = partners.map(p => p.id);

    // Una sola query para todos los apuntes a cobrar abiertos de estos partners.
    const lines = await search_read('account.move.line',
      [
        ['partner_id','in', partnerIds],
        ['account_id.account_type','=','asset_receivable'],
        ['reconciled','=', false],
        ['parent_state','=','posted'],
      ],
      ['partner_id','move_name','date','date_maturity','debit','credit',
       'amount_residual','name','ref','journal_id'],
      { limit: 5000 });

    // Agrupar por partner.
    const byPartner = new Map();
    for (const l of lines) {
      const pid = Array.isArray(l.partner_id) ? l.partner_id[0] : l.partner_id;
      if (!byPartner.has(pid)) byPartner.set(pid, []);
      byPartner.get(pid).push(l);
    }

    const rows = partners.map(p => {
      const pls = byPartner.get(p.id) || [];
      const isOpening = (l) => OPENING_KEYWORDS.test(l.ref || '') || OPENING_KEYWORDS.test(l.name || '') || OPENING_KEYWORDS.test(l.move_name || '');
      const openings = pls.filter(isOpening);
      const others   = pls.filter(l => !isOpening(l));
      const sum = (arr) => arr.reduce((a,l)=>a + ((l.debit||0) - (l.credit||0)), 0);
      const openingsTotal = sum(openings);
      const realTotal = sum(others);
      return {
        odooId: p.id,
        name: p.name,
        code: p.ref || '',
        officialCredit: p.credit || 0,
        openingsTotal,
        openingsCount: openings.length,
        realTotal,
        realCount: others.length,
        correctedBalance: realTotal,
        delta: (p.credit || 0) - realTotal,
        openings: openings.map(l => ({
          moveName: l.move_name || '',
          date: l.date || '',
          residual: l.amount_residual || 0,
          ref: l.ref || '',
          name: l.name || '',
          journal: l.journal_id?.[1] || '',
        })),
      };
    });

    // Ordenar por mayor delta descendente (los más afectados primero).
    rows.sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta));

    const summary = {
      partners: rows.length,
      withOpenings: rows.filter(r => r.openingsCount > 0).length,
      totalOfficial: rows.reduce((a,r)=>a+r.officialCredit, 0),
      totalCorrected: rows.reduce((a,r)=>a+r.correctedBalance, 0),
      totalOpenings: rows.reduce((a,r)=>a+r.openingsTotal, 0),
    };

    res.status(200).json({ rows, summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
