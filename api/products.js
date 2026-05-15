import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { PRODUCTS } from './_lib/mock.js';
import { mapTemplate } from './_lib/mappers.js';
import { resolveFamilies } from './_lib/families.js';
import { requireComercial } from './_lib/auth.js';
import { resolvePricelistId, computePrices, getComercialPvpId, COMERCIAL_PVP_MARKUP_FOR_SALES } from './_lib/pricing.js';
import { resolvePackagings } from './_lib/packaging.js';

// Devuelve un artículo (product.template) por línea — las variantes se eligen
// en el modal del producto, no en el catálogo principal.
export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
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
      'name', 'default_code', 'barcode', 'x_studio_referencia',
      'list_price', 'qty_available', 'categ_id',
      'product_variant_count', 'product_variant_ids',
      'uom_ids', // Odoo 18+ usa uom_ids como packaging
    ];
    const rows = await search_read('product.template', domain, fields, { limit: 1000 });

    // Aplicar tarifa: del cliente si viene partnerId, si no la default ("Comercial PVP").
    const partnerId = parseInt(req.query?.partnerId, 10) || null;
    const pricelistId = await resolvePricelistId(partnerId);
    // Primera variante de cada template para rellenar SKU/EAN si el template
    // los tiene vacíos. Para el precio de la tarjeta usamos el MÍNIMO de
    // todas las variantes — así el precio mostrado nunca es mayor al que el
    // comercial verá luego al abrir el modal de variantes.
    const variantByTemplate = new Map();
    for (const r of rows) {
      const vId = (r.product_variant_ids || [])[0];
      if (vId) variantByTemplate.set(r.id, vId);
    }
    const firstVariantIds = [...variantByTemplate.values()];
    const allVariantIds = [...new Set(rows.flatMap(r => r.product_variant_ids || []))];
    const [priceByVariant, variantInfoRows, pvpId, packagingByTpl] = await Promise.all([
      computePrices(pricelistId, allVariantIds, partnerId),
      firstVariantIds.length
        ? search_read('product.product',
            [['id','in', firstVariantIds]],
            ['id','default_code','barcode','x_studio_referencia'],
            { limit: firstVariantIds.length })
        : Promise.resolve([]),
      getComercialPvpId(),
      resolvePackagings(rows),
    ]);
    const variantInfoById = new Map(variantInfoRows.map(v => [v.id, v]));
    // Recargo de visualización: si la tarifa aplicada es Comercial PVP y el
    // usuario es comercial (NO admin, NO portal-cliente), ocultamos el PVP
    // real subiéndolo un 15%. El portal-cliente ES el cliente final y debe
    // ver siempre el precio real de su tarifa.
    const inflate = c.role !== 'admin' && !c.portalPartnerId && pricelistId && pvpId && pricelistId === pvpId;
    const markup = inflate ? COMERCIAL_PVP_MARKUP_FOR_SALES : 1;

    const items = rows.map(r => {
      const m = mapTemplate(r);
      // Para palos aluminio: forzar single-variant (la primera variante)
      if (palosCategIds.has(r.categ_id?.[0]) && m.variantIds?.length) {
        m.variantCount = 1;
        m.odooId = m.variantIds[0];
      }
      // Precio = mínimo de todas las variantes del template.
      const vids = r.product_variant_ids || [];
      const prices = vids.map(v => priceByVariant.get(v)).filter(x => typeof x === 'number');
      if (prices.length) m.pvp = Math.min(...prices) * markup;

      // SKU/EAN fallback desde la primera variante.
      const firstV = variantByTemplate.get(r.id);
      if (firstV) {
        const v = variantInfoById.get(firstV);
        if (v) {
          if (!m.sku) m.sku = v.x_studio_referencia || v.default_code || '';
          if (!m.ean && v.barcode) m.ean = v.barcode;
        }
      }
      const pkg = packagingByTpl.get(r.id);
      if (pkg) m.packaging = pkg; // { name, qty }
      return m;
    });
    res.status(200).json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
