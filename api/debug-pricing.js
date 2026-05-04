// TEMPORAL — diagnóstico de precios para un producto.
// GET /api/debug-pricing?templateId=NNN

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });
  const templateId = parseInt(req.query?.templateId, 10);
  if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

  // 1) Template + variantes
  const [tpl] = await search_read('product.template',
    [['id','=', templateId]],
    ['id','name','default_code','standard_price','list_price','categ_id','product_variant_ids'],
    { limit: 1 });
  if (!tpl) return res.status(404).json({ error: 'No existe' });
  const variants = await search_read('product.product',
    [['id','in', tpl.product_variant_ids || []]],
    ['id','default_code','standard_price','list_price','product_tmpl_id','categ_id'],
    { limit: 50 });

  // 2) TODAS las reglas de las 3 tarifas (cualquier scope)
  const rulesByPricelist = {};
  for (const plId of [11, 12, 13]) {
    rulesByPricelist[plId] = await search_read('product.pricelist.item',
      [['pricelist_id','=', plId]],
      ['id','applied_on','base','base_pricelist_id','compute_price',
       'fixed_price','percent_price','price_discount','price_surcharge',
       'price_round','price_min_margin','price_max_margin',
       'product_id','product_tmpl_id','categ_id','min_quantity','date_start','date_end'],
      { limit: 200 });
  }

  // 3) Reglas específicas que matchean este producto
  const matchesFor = (rules, product) => rules.filter(r => {
    switch (r.applied_on) {
      case '0_product_variant':
        return Array.isArray(r.product_id) && r.product_id[0] === product.id;
      case '1_product':
        return Array.isArray(r.product_tmpl_id) && r.product_tmpl_id[0] === product.product_tmpl_id;
      case '2_product_category': {
        const cId = Array.isArray(product.categ_id) ? product.categ_id[0] : product.categ_id;
        return Array.isArray(r.categ_id) && r.categ_id[0] === cId;
      }
      case '3_global': default: return true;
    }
  });

  const sample = variants[0];
  const sampleNorm = sample ? {
    id: sample.id,
    product_tmpl_id: Array.isArray(sample.product_tmpl_id) ? sample.product_tmpl_id[0] : sample.product_tmpl_id,
    categ_id: Array.isArray(sample.categ_id) ? sample.categ_id[0] : sample.categ_id,
    standard_price: sample.standard_price,
    list_price: sample.list_price,
  } : null;

  res.status(200).json({
    template: tpl,
    variants,
    rulesByPricelist,
    matchingFor: sampleNorm ? {
      pl11_distribuidores: matchesFor(rulesByPricelist[11], sampleNorm),
      pl12_tiendas:        matchesFor(rulesByPricelist[12], sampleNorm),
      pl13_pvp:            matchesFor(rulesByPricelist[13], sampleNorm),
    } : null,
  });
}
