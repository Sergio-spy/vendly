// Resolución de packaging (cajas/palés) para una lista de templates.
//
// En este Odoo (versión 18+) el packaging vive en `product.template.uom_ids`
// — un many2many a `uom.uom`. Cada uom tiene `relative_factor` = unidades
// base (uom_id) por una unidad del packaging (ej. "CAJAS DE 14" tiene
// relative_factor=14, lo que significa 14 uds por caja).
//
// Esta función toma las filas crudas de product.template (con `uom_ids`
// poblado), recolecta los uom ids únicos y los lee en batch, y devuelve un
// Map<templateId, { name, qty }> con el primer packaging de cada template.

import { search_read } from './odoo.js';

let _uomFieldsPromise = null;
async function detectUomFactorField() {
  // Odoo 18 usa `relative_factor`; Odoo <=17 usa `factor`. Detecta runtime
  // y cachea por proceso.
  if (_uomFieldsPromise) return _uomFieldsPromise;
  _uomFieldsPromise = (async () => {
    try {
      const probe = await search_read('uom.uom', [['id','>',0]], [], { limit: 1 });
      if (probe?.[0]?.relative_factor !== undefined) return 'relative_factor';
      if (probe?.[0]?.factor          !== undefined) return 'factor';
    } catch {}
    return 'relative_factor'; // fallback
  })();
  return _uomFieldsPromise;
}

// templates: array de filas tal cual devueltas por search_read('product.template')
// con `uom_ids` en los fields. Devuelve Map<templateId, { name, qty }>.
export async function resolvePackagings(templates) {
  const out = new Map();
  if (!templates?.length) return out;
  const allUomIds = new Set();
  for (const t of templates) {
    const ids = t?.uom_ids || [];
    for (const id of ids) allUomIds.add(id);
  }
  if (!allUomIds.size) return out;

  const factorField = await detectUomFactorField();
  let uomRows;
  try {
    uomRows = await search_read('uom.uom', [['id','in', [...allUomIds]]],
      ['id','name', factorField], { limit: 200 });
  } catch (e) {
    console.warn('[packaging] no se pudo leer uom.uom:', e.message);
    return out;
  }
  const byId = new Map(uomRows.map(u => [u.id, u]));

  for (const t of templates) {
    const ids = t?.uom_ids || [];
    if (!ids.length) continue;
    // Tomamos el packaging con menor factor (la "caja" más pequeña). En la
    // práctica la mayoría de productos solo tienen uno.
    let chosen = null;
    for (const id of ids) {
      const u = byId.get(id);
      if (!u) continue;
      const factor = Number(u[factorField]) || 0;
      if (factor <= 1) continue; // base unit u otras sin sentido como caja
      if (!chosen || factor < (Number(chosen[factorField]) || Infinity)) chosen = u;
    }
    if (chosen) {
      const qty = Math.round(Number(chosen[factorField]) || 0);
      if (qty > 1) out.set(t.id, { name: chosen.name, qty });
    }
  }
  return out;
}
