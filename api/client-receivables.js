// GET /api/client-receivables?id=ODOO_ID
// Devuelve el desglose de los apuntes contables abiertos (no conciliados) en
// las cuentas a cobrar del partner. Sirve para entender de dónde sale el saldo
// `credit` que se ve en la pantalla de Cobros.

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  const id = parseInt(req.query?.id, 10);
  if (!id) return res.status(400).json({ error: 'Falta id' });

  if (MOCK_MODE) return res.status(200).json({ partner: null, lines: [], summary: {} });

  try {
    const partners = await search_read('res.partner',
      [['id','=', id]],
      ['name','ref','credit','debit','total_invoiced','company_id'],
      { limit: 1 });
    if (!partners.length) return res.status(404).json({ error: 'Partner no encontrado' });
    const partner = partners[0];

    // Apuntes contables abiertos en cuentas de tipo "asset_receivable"
    // pertenecientes a este partner.
    const moveLines = await search_read('account.move.line',
      [
        ['partner_id','=', id],
        ['account_id.account_type','=','asset_receivable'],
        ['reconciled','=', false],
        ['parent_state','=','posted'],
      ],
      [
        'move_id','move_name','date','date_maturity',
        'debit','credit','amount_residual',
        'name','ref','journal_id','account_id','currency_id',
      ],
      { limit: 500, order: 'date asc' });

    // Suma para chequear que coincide con partner.credit.
    const sumDebit  = moveLines.reduce((a,l)=>a+(l.debit||0),0);
    const sumCredit = moveLines.reduce((a,l)=>a+(l.credit||0),0);
    const sumResid  = moveLines.reduce((a,l)=>a+(l.amount_residual||0),0);

    res.status(200).json({
      partner: {
        odooId: partner.id,
        name: partner.name,
        code: partner.ref || '',
        credit: partner.credit || 0,
        debit: partner.debit || 0,
        totalInvoiced: partner.total_invoiced || 0,
        company: partner.company_id?.[1] || null,
      },
      lines: moveLines.map(l => ({
        moveId:    l.move_id?.[0] || null,
        moveName:  l.move_name || l.move_id?.[1] || '',
        date:      l.date || '',
        dueDate:   l.date_maturity || '',
        debit:     l.debit || 0,
        credit:    l.credit || 0,
        residual:  l.amount_residual || 0,
        name:      l.name || '',
        ref:       l.ref || '',
        journal:   l.journal_id?.[1] || '',
        account:   l.account_id?.[1] || '',
      })),
      summary: {
        rows: moveLines.length,
        sumDebit, sumCredit,
        netOpen: sumDebit - sumCredit,
        sumResidual: sumResid,
        partnerCredit: partner.credit || 0,
        match: Math.abs((sumDebit - sumCredit) - (partner.credit || 0)) < 0.01,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
