// Helper compartido por /api/orders y /api/bootstrap para inyectar
// `__deliveryStatus` en cada fila de sale.order según el estado de sus
// stock.picking asociados.
//   'full'    → todos los albaranes en state='done'
//   'partial' → al menos uno en 'done' pero no todos
//   'pending' → ninguno en 'done'
//   null      → el pedido no tiene albaranes (servicio puro o similar)

import { search_read } from './odoo.js';

export async function attachDeliveryStatus(orderRows) {
  if (!orderRows.length) return orderRows;
  const allPickIds = [...new Set(orderRows.flatMap(o => o.picking_ids || []))];
  if (!allPickIds.length) {
    for (const o of orderRows) o.__deliveryStatus = null;
    return orderRows;
  }
  const pickings = await search_read('stock.picking',
    [['id','in', allPickIds]], ['id','state'], { limit: 5000 });
  const stateById = new Map(pickings.map(p => [p.id, p.state]));
  for (const o of orderRows) {
    const ids = o.picking_ids || [];
    if (!ids.length) { o.__deliveryStatus = null; continue; }
    const states = ids.map(id => stateById.get(id));
    if (states.every(s => s === 'done')) o.__deliveryStatus = 'full';
    else if (states.some(s => s === 'done')) o.__deliveryStatus = 'partial';
    else o.__deliveryStatus = 'pending';
  }
  return orderRows;
}
