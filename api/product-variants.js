// GET /api/product-variants?templateId=123
// Devuelve las variantes (product.product) de un template, con sus atributos
// extraídos del display_name "Nombre (Color: Azul, Tamaño: M)".

import { MOCK_MODE, search_read } from './_lib/odoo.js';
import { mapVariant } from './_lib/mappers.js';
import { requireComercial } from './_lib/auth.js';
import { resolvePricelistId, computePrices, getComercialPvpId, COMERCIAL_PVP_MARKUP_FOR_SALES } from './_lib/pricing.js';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  const templateId = parseInt(req.query?.templateId, 10);
  if (!templateId) return res.status(400).json({ error: 'Falta templateId' });

  if (MOCK_MODE) return res.status(200).json([]);

  try {
    const fields = ['name','display_name','default_code','barcode','x_studio_referencia','list_price','qty_available'];
    const rows = await search_read(
      'product.product',
      [['product_tmpl_id','=', templateId]],
      fields,
      { limit: 200 }
    );

    const partnerId = parseInt(req.query?.partnerId, 10) || null;
    const [pricelistId, pvpId] = await Promise.all([
      resolvePricelistId(partnerId),
      getComercialPvpId(),
    ]);
    const priceByVariant = await computePrices(pricelistId, rows.map(r => r.id), partnerId);
    // Recargo de visualización si la tarifa aplicada es Comercial PVP y el usuario no es admin.
    // Portal-cliente (c.portalPartnerId set) NO recibe markup: es el cliente final.
    const inflate = c.role !== 'admin' && !c.portalPartnerId && pricelistId && pvpId && pricelistId === pvpId;
    const markup = inflate ? COMERCIAL_PVP_MARKUP_FOR_SALES : 1;

    const variants = rows.map(r => {
      const m = mapVariant(r);
      if (priceByVariant.has(r.id)) m.pvp = priceByVariant.get(r.id) * markup;
      return m;
    });
    res.status(200).json(variants);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
