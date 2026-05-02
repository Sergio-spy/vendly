import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { TARIFFS } from './_lib/mock.js';
import { mapPricelist } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  try {
    if (req.method === 'GET') {
      if (MOCK_MODE) return res.status(200).json(TARIFFS);
      // Solo las tarifas comerciales (las internas no interesan en la app).
      const rows = await search_read('product.pricelist',
        [['name','=ilike','Comercial%']], ['name','currency_id'], { limit: 50 });
      return res.status(200).json(rows.map(mapPricelist));
    }

    if (req.method === 'POST') {
      // Crear nueva tarifa. Solo admin (los comerciales no crean tarifas).
      if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
      const { name } = req.body || {};
      if (!name || !name.trim()) return res.status(400).json({ error: 'Falta name' });
      // Se fuerza prefijo "Comercial " para que aparezca en el filtro de la app.
      const finalName = name.trim().toLowerCase().startsWith('comercial')
        ? name.trim() : `Comercial ${name.trim()}`;
      if (MOCK_MODE) return res.status(200).json({ id: `T${Math.floor(Math.random()*9000+1000)}`, odooId: 0 });
      const odooId = await call('product.pricelist', 'create', [{ name: finalName }]);
      return res.status(200).json({ id: `T${odooId}`, odooId });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
