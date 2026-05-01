// POST /api/assign-tariff
// Body: { tariffOdooId: number, clientOdooIds: number[] }
// Asigna la tarifa a todos los clientes indicados (escribe property_product_pricelist).

import { MOCK_MODE, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const tariffOdooId = parseInt(req.body?.tariffOdooId, 10);
  const clientOdooIds = Array.isArray(req.body?.clientOdooIds)
    ? req.body.clientOdooIds.map(n => parseInt(n, 10)).filter(Number.isFinite)
    : [];
  if (!tariffOdooId)         return res.status(400).json({ error: 'Falta tariffOdooId' });
  if (!clientOdooIds.length) return res.status(400).json({ error: 'Sin clientes' });

  if (MOCK_MODE) return res.status(200).json({ ok: true, updated: clientOdooIds.length });

  try {
    await call('res.partner', 'write', [clientOdooIds, { property_product_pricelist: tariffOdooId }]);
    res.status(200).json({ ok: true, updated: clientOdooIds.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
