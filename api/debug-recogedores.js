// TEMPORAL — diagnostica por qué la familia "Recogedores" no muestra productos.
import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';
import { resolveFamilies, FAMILY_PATHS } from './_lib/families.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  if (MOCK_MODE) return res.status(200).json({ mock: true });

  // 1) Categorías de Odoo cuyo nombre/path contiene "recoge"
  const cats = await search_read('product.category', [], ['id','name','complete_name','parent_id'], { limit: 1000 });
  const matches = cats.filter(c =>
    /recoge/i.test(c.name || '') || /recoge/i.test(c.complete_name || '')
  );

  // 2) Resolución de families con la lista actual de FAMILY_PATHS
  const fams = resolveFamilies(cats);
  const recogeFam = fams.find(f => /recoge/i.test(f.key) || /recoge/i.test(f.name || ''));

  // 3) Productos sale_ok en esas categorías
  const catIds = matches.map(c => c.id);
  const products = catIds.length
    ? await search_read('product.template', [['categ_id','in', catIds]],
        ['id','name','default_code','sale_ok','active','categ_id'], { limit: 50 })
    : [];

  res.status(200).json({
    family_paths_relevant: FAMILY_PATHS.filter(p => /recoge/i.test(p)),
    matching_categories: matches,
    resolved_family: recogeFam || null,
    products_in_those_cats: products,
  });
}
