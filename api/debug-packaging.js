// TEMPORAL — encuentra dónde viven las "unidades por caja" para un producto.
// GET /api/debug-packaging?templateId=NNN

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });
  const templateId = parseInt(req.query?.templateId, 10);
  if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

  // 1) fields_get: busca campos relacionados con caja/packaging/embalaje
  const tplFields = await call('product.template', 'fields_get', [], { attributes: ['string','type','relation'] });
  const candidates = Object.entries(tplFields).filter(([name, meta]) => {
    const label = (meta.string || '').toLowerCase();
    return /pack|caja|box|emball|emball|embalaj|qty_avail|uom|unidad/.test(name)
        || /caja|paquete|empaqu|embalaj|unidad/.test(label)
        || name.startsWith('x_');
  }).map(([name, meta]) => ({ name, label: meta.string, type: meta.type, relation: meta.relation }));

  // 2) Lee el template con esos campos + uom + packaging_ids
  const fields = ['id','name','uom_id','uom_po_id','packaging_ids',
    ...candidates.map(c => c.name)];
  const uniqFields = [...new Set(fields)];
  const [tpl] = await search_read('product.template', [['id','=', templateId]], uniqFields, { limit: 1 });

  // 3) Si tiene packaging_ids, los leemos
  let packagings = null;
  if (Array.isArray(tpl?.packaging_ids) && tpl.packaging_ids.length) {
    const pkgFields = await call('product.packaging', 'fields_get', [], { attributes: ['string','type'] });
    packagings = await search_read('product.packaging', [['id','in', tpl.packaging_ids]],
      ['id','name','qty','barcode','product_uom_id','sales','purchase'].filter(f => f in pkgFields),
      { limit: 50 });
  }

  res.status(200).json({
    template: tpl,
    candidate_fields_in_template: candidates,
    packagings,
    note: 'Si packaging_ids != [] → es estándar Odoo (product.packaging). Si packaging_ids = [] pero un x_studio_* tiene un número como 14 → campo custom.',
  });
}
