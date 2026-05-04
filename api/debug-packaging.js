// TEMPORAL — encuentra dónde viven las "unidades por caja" para un producto.
// GET /api/debug-packaging?templateId=NNN

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });
  const templateId = parseInt(req.query?.templateId, 10);
  if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

  const out = { templateId, steps: {} };

  try {
    const tplFields = await call('product.template', 'fields_get', [], { attributes: ['string','type','relation'] });
    out.steps.fields_get = 'ok';
    const candidates = Object.entries(tplFields).filter(([name, meta]) => {
      const label = (meta.string || '').toLowerCase();
      return /pack|caja|box|emball|embalaj|uom|unidad/.test(name)
          || /caja|paquete|empaqu|embalaj|unidad/.test(label)
          || name.startsWith('x_');
    }).map(([name, meta]) => ({ name, label: meta.string, type: meta.type, relation: meta.relation }));
    out.candidates = candidates;
    out.has_packaging_ids = 'packaging_ids' in tplFields;

    // Lee solo campos seguros (saltando los que no existen)
    const safeFieldNames = ['id','name', ...candidates.map(c => c.name).filter(n => n in tplFields)];
    if ('packaging_ids' in tplFields) safeFieldNames.push('packaging_ids');
    const uniqFields = [...new Set(safeFieldNames)];
    const tplRows = await search_read('product.template', [['id','=', templateId]], uniqFields, { limit: 1 });
    out.steps.template_read = 'ok';
    out.template = tplRows[0] || null;

    if (out.template?.packaging_ids?.length) {
      try {
        out.packagings = await search_read('product.packaging', [['id','in', out.template.packaging_ids]],
          ['id','name','qty','barcode'],
          { limit: 50 });
      } catch (e) { out.packagings_error = e.message; }
    }

    // Si Odoo 18+ usa uom_ids como packaging
    if (out.template?.uom_ids?.length) {
      try {
        out.uoms = await search_read('uom.uom', [['id','in', out.template.uom_ids]],
          ['id','name','factor','factor_inv','category_id','rounding','active'],
          { limit: 50 });
      } catch (e) { out.uoms_error = e.message; }
    }
  } catch (e) {
    out.error = e.message;
    out.stack = e.stack;
  }

  res.status(200).json(out);
}
