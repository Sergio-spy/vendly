// /api/promos
//   GET     → listar promociones (loyalty.program de Odoo, mapeadas a la forma que usa el front)
//   POST    → crear (admin)
//   PUT     → editar (admin)
//   DELETE  → eliminar (admin)
//
// Modelo objetivo: loyalty.program (Odoo 17). Si esa instancia usa
// sale.coupon.program (versiones antiguas) habrá que adaptar.
//
// Forma de cada promo en la app:
//   { id (Pxxx), odooId, title, kind, sku, end, stock, productIds, active }

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { PROMOS } from './_lib/mock.js';
import { requireComercial } from './_lib/auth.js';

function mapLoyaltyProgram(p) {
  // En Odoo 17 cada loyalty.program tiene reward_ids (loyalty.reward) y
  // rule_ids (loyalty.rule) con el detalle. Aquí mostramos un resumen útil.
  const stock = p.coupon_count || 0;
  return {
    id:         `P${p.id}`,
    odooId:     p.id,
    title:      p.name || '',
    kind:       p.program_type || '',     // ej. 'promotion', 'coupons', 'gift_card'
    end:        (p.date_to || '').slice(0,10),
    start:      (p.date_from || '').slice(0,10),
    active:     !!p.active,
    rewardIds:  p.reward_ids || [],
    ruleIds:    p.rule_ids || [],
    stock,
    sku:        null,
  };
}

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;

  // Solo admin puede crear/editar/borrar.
  const isAdmin = c.role === 'admin';

  try {
    if (MOCK_MODE) {
      if (req.method === 'GET') return res.status(200).json(PROMOS);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const rows = await search_read('loyalty.program',
        [['active','in', [true, false]]],
        ['name','program_type','active','date_from','date_to','reward_ids','rule_ids','coupon_count'],
        { limit: 200, order: 'date_from desc' });
      return res.status(200).json(rows.map(mapLoyaltyProgram));
    }

    if (!isAdmin) return res.status(403).json({ error: 'Solo admin' });

    if (req.method === 'POST') {
      const { name, programType = 'promotion', dateFrom, dateTo, active = true } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Falta name' });
      const vals = { name, program_type: programType, active };
      if (dateFrom) vals.date_from = dateFrom;
      if (dateTo)   vals.date_to   = dateTo;
      const id = await call('loyalty.program', 'create', [vals]);
      return res.status(200).json({ id: `P${id}`, odooId: id });
    }

    if (req.method === 'PUT') {
      const odooId = parseInt(req.body?.odooId, 10);
      if (!odooId) return res.status(400).json({ error: 'Falta odooId' });
      const vals = {};
      const { name, programType, dateFrom, dateTo, active } = req.body || {};
      if (name !== undefined)        vals.name = name;
      if (programType !== undefined) vals.program_type = programType;
      if (dateFrom !== undefined)    vals.date_from = dateFrom || false;
      if (dateTo !== undefined)      vals.date_to   = dateTo   || false;
      if (active !== undefined)      vals.active = active;
      if (Object.keys(vals).length === 0) return res.status(400).json({ error: 'Sin cambios' });
      await call('loyalty.program', 'write', [[odooId], vals]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const odooId = parseInt(req.query?.odooId, 10);
      if (!odooId) return res.status(400).json({ error: 'Falta odooId' });
      // En lugar de borrar, archivamos: más seguro y reversible.
      await call('loyalty.program', 'write', [[odooId], { active: false }]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
