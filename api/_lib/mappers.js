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
  const stateMap = { draft:'borrador', sent:'pendiente', sale:'pendiente', done:'exportado', cancel:'borrador' };
  return {
    id:     r.name,
    odooId: r.id,
    client: r.partner_id ? `C${String(r.partner_id[0]).padStart(2,'0')}` : '',
    date:   (r.date_order || '').slice(0,10),
    total:  r.amount_total || 0,
    lines:  r.order_line?.length || 0,
    status: stateMap[r.state] || 'borrador',
  };
}
