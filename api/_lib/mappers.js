// Mapeo Odoo → forma esperada por el frontend de Vendly.
// Ajusta los nombres de campo si tu instancia tiene módulos custom.

import { glyphFor, colorFor } from './families.js';

export function mapPartner(r) {
  return {
    id:          `C${String(r.id).padStart(2,'0')}`,
    odooId:      r.id,
    code:        r.ref || String(r.id),
    name:        r.name,
    cif:         r.vat || '',
    city:        r.city || '',
    address:     [r.street, r.street2].filter(Boolean).join(' · '),
    tariff:      r.property_product_pricelist?.[1] || 'T2',
    credit:      r.credit_limit || 0,
    balance:     r.credit || 0,
    paymentTerm: r.property_payment_term_id?.[1] || '',
    lastOrder:   '',
    status:      (r.credit > 0) ? 'pendiente' : 'al-dia',
    totalYtd:    r.total_invoiced || 0,
    contact:     r.child_ids?.[0]?.name || r.name,
    phone:       r.phone || '',
  };
}

export function mapProduct(r) {
  const categName = r.categ_id?.[1] || '';
  return {
    id:     `P${String(r.id).padStart(3,'0')}`,
    odooId: r.id,
    sku:    r.default_code || '',
    ean:    r.barcode || '',
    name:   r.display_name || r.name,
    // family es el ID numérico de la categoría Odoo (para filtrar por igualdad)
    family: r.categ_id?.[0] ?? null,
    brand:  '',
    pvp:    r.list_price || 0,
    stock:  r.qty_available || 0,
    oferta: false,
    promo:  null,
    color:  colorFor(categName),
    glyph:  glyphFor(categName),
  };
}

// Mapea un product.template (lo que se muestra como "artículo" en el catálogo).
// Si el template tiene una sola variante (variantCount === 1), variantId es el id
// de esa variante para poder añadirla al carrito directamente. Si tiene >1
// variante, el carrito necesita que el comercial elija una en el modal.
export function mapTemplate(r) {
  const categName = r.categ_id?.[1] || '';
  const variantIds = r.product_variant_ids || [];
  return {
    id:           `T${String(r.id).padStart(3,'0')}`,
    templateId:   r.id,
    odooId:       variantIds.length === 1 ? variantIds[0] : null, // solo si tiene una sola variante
    sku:          r.default_code || '',
    ean:          r.barcode || '',
    name:         r.name, // sin paréntesis de variante (display_name los trae)
    family:       r.categ_id?.[0] ?? null,
    brand:        '',
    pvp:          r.list_price || 0,
    stock:        r.qty_available || 0,
    oferta:       false,
    promo:        null,
    color:        colorFor(categName),
    glyph:        glyphFor(categName),
    variantCount: r.product_variant_count || variantIds.length,
    variantIds,
  };
}

// Variante concreta de un template (product.product). Extrae las características
// de la variante desde el display_name "Nombre (Color: Azul, Tamaño: M)".
export function mapVariant(r) {
  const dn = r.display_name || r.name || '';
  const m = dn.match(/\(([^)]+)\)\s*$/);
  return {
    id:        `V${String(r.id).padStart(3,'0')}`,
    odooId:    r.id,
    sku:       r.default_code || '',
    ean:       r.barcode || '',
    name:      m ? dn.replace(/\s*\([^)]+\)\s*$/, '').trim() : dn,
    attrLabel: m ? m[1] : '', // ej. "Color: Azul, Tamaño: M"
    pvp:       r.list_price || 0,
    stock:     r.qty_available || 0,
  };
}

export function mapPricelist(r) {
  return {
    id:      `T${r.id}`,
    odooId:  r.id,
    name:    r.name,
    desc:    r.currency_id?.[1] || 'Tarifa',
    clients: 0,
    color:   '#2473c5',
  };
}

export function mapOrder(r) {
  // Estado mostrado en la app:
  // - cancelado: state=cancel
  // - borrador:  state=draft
  // - facturado: invoice_status='invoiced' (la factura está emitida y completa)
  // - pendiente: el resto (sent / sale aún no facturados)
  let status = 'pendiente';
  if (r.state === 'cancel')                   status = 'cancelado';
  else if (r.state === 'draft')               status = 'borrador';
  else if (r.invoice_status === 'invoiced')   status = 'facturado';
  return {
    id:         r.name,
    odooId:     r.id,
    client:     r.partner_id ? `C${String(r.partner_id[0]).padStart(2,'0')}` : '',
    date:       (r.date_order || '').slice(0,10),
    total:      r.amount_total || 0,
    lines:      r.order_line?.length || 0,
    status,
    invoiceIds: Array.isArray(r.invoice_ids) ? r.invoice_ids : [],
  };
}
