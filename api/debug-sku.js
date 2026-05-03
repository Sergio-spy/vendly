// TEMPORAL — verifica todos los campos de un producto, incluidos custom (x_*).
// GET /api/debug-sku?templateId=1048

import { MOCK_MODE, search_read, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });
  const templateId = parseInt(req.query?.templateId, 10);
  if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

  // 1) Lista TODOS los campos de product.template y filtra los que parecen referencia.
  const tplFields = await call('product.template', 'fields_get', [], { attributes: ['string','type'] });
  const candidateTplFields = Object.entries(tplFields).filter(([name, meta]) => {
    const label = (meta.string || '').toLowerCase();
    return /ref|cod|sku/.test(name) || /referen|código|codigo/i.test(label) || name.startsWith('x_');
  }).map(([name, meta]) => ({ name, label: meta.string, type: meta.type }));

  const prodFields = await call('product.product', 'fields_get', [], { attributes: ['string','type'] });
  const candidateProdFields = Object.entries(prodFields).filter(([name, meta]) => {
    const label = (meta.string || '').toLowerCase();
    return /ref|cod|sku/.test(name) || /referen|código|codigo/i.test(label) || name.startsWith('x_');
  }).map(([name, meta]) => ({ name, label: meta.string, type: meta.type }));

  // 2) Lee el template y la primera variante con TODOS los campos candidatos.
  const tplFieldNames = ['id','name','default_code','barcode', ...candidateTplFields.map(f => f.name)];
  // Eliminar duplicados.
  const uniqTplFields = [...new Set(tplFieldNames)];
  const [tpl] = await search_read('product.template', [['id','=', templateId]], uniqTplFields, { limit: 1 });

  let variant = null;
  const vIds = (await search_read('product.product', [['product_tmpl_id','=', templateId]], ['id'], { limit: 1 })).map(r => r.id);
  if (vIds.length) {
    const prodFieldNames = ['id','default_code','barcode','display_name', ...candidateProdFields.map(f => f.name)];
    const uniqProdFields = [...new Set(prodFieldNames)];
    [variant] = await search_read('product.product', [['id','=', vIds[0]]], uniqProdFields, { limit: 1 });
  }

  res.status(200).json({
    templateId,
    template_candidate_fields: candidateTplFields,
    template_values: tpl,
    variant_candidate_fields: candidateProdFields,
    variant_values: variant,
  });
}
