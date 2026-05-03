import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { PRODUCTS } from './_lib/mock.js';
import { mapTemplate } from './_lib/mappers.js';
import { resolveFamilies } from './_lib/families.js';
import { requireComercial } from './_lib/auth.js';
import { resolvePricelistId, computePrices } from './_lib/pricing.js';

// Devuelve un artículo (product.template) por línea — las variantes se eligen
// en el modal del producto, no en el catálogo principal.
export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  try {
    if (MOCK_MODE) return res.status(200).json(PRODUCTS);

    // Resolvemos los IDs de las categorías configuradas → así solo
    // traemos los productos de las familias relevantes (no todo el catálogo).
    const cats = await search_read('product.category', [], ['name','complete_name','parent_id'], { limit: 500 });
    const fams = resolveFamilies(cats).filter(f => f.odooId != null);
    const familyIds = fams.map(f => f.odooId);

    // Categorías de "Palos Aluminio":
    //   - TODAS se tratan como single-variant en el catálogo (no selector).
    //   - El filtro "agujero" en el nombre solo aplica a las NO-Anodizadas
    //     (ECO/PRO Empuñaduras/Plastificado). En Anodizado se muestran todos.
    const palosCategIds = new Set(
      fams.filter(f => f.key.startsWith('Palos Aluminio')).map(f => f.odooId)
    );
    const palosAgujeroCategIds = new Set(
      fams.filter(f => f.key.startsWith('Palos Aluminio/') && !f.key.includes('Anodizado'))
          .map(f => f.odooId)
    );

    // Dominio Odoo: sale_ok=true AND categ_id IN families
    //   AND (categ_id NOT IN palosNoAnodizados OR name ILIKE 'agujero')
    const domain = [['sale_ok','=',true]];
    if (familyIds.length) domain.push(['categ_id','in', familyIds]);
    if (palosAgujeroCategIds.size) {
      domain.push('|',
        ['categ_id','not in', [...palosAgujeroCategIds]],
        ['name','ilike','agujero']);
    }

    const fields = [
      'name', 'default_code', 'barcode',
      'list_price', 'qty_available', 'categ_id',
      'product_variant_count', 'product_variant_ids',
    ];
    const rows = await search_read('product.template', domain, fields, { limit: 1000 });

    // Aplicar tarifa: del cliente si viene partnerId, si no la default ("Comercial PVP").
    const partnerId = parseInt(req.query?.partnerId, 10) || null;
    const pricelistId = await resolvePricelistId(partnerId);
    // Tomamos la primera variante de cada template como representante para el precio
    // y para rellenar SKU/EAN si el template los tiene vacíos (ocurre cuando solo
    // están definidos a nivel de variante).
    const variantByTemplate = new Map();
    for (const r of rows) {
      const vId = (r.product_variant_ids || [])[0];
      if (vId) variantByTemplate.set(r.id, vId);
    }
    const variantIds = [...variantByTemplate.values()];
    const [priceByVariant, variantInfoRows] = await Promise.all([
      computePrices(pricelistId, variantIds, partnerId),
      variantIds.length
        ? search_read('product.product',
            [['id','in', variantIds]],
            ['id','default_code','barcode'],
            { limit: variantIds.length })
        : Promise.resolve([]),
    ]);
    const variantInfoById = new Map(variantInfoRows.map(v => [v.id, v]));

    const items = rows.map(r => {
      const m = mapTemplate(r);
      // Para palos aluminio: forzar single-variant (la primera variante)
      if (palosCategIds.has(r.categ_id?.[0]) && m.variantIds?.length) {
        m.variantCount = 1;
        m.odooId = m.variantIds[0];
      }
      const vId = variantByTemplate.get(r.id);
      if (vId) {
        if (priceByVariant.has(vId)) m.pvp = priceByVariant.get(vId);
        const v = variantInfoById.get(vId);
        if (v) {
          if (!m.sku && v.default_code) m.sku = v.default_code;
          if (!m.ean && v.barcode)       m.ean = v.barcode;
        }
      }
      return m;
    });
    res.status(200).json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
