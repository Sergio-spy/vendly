// Drena la outbox: para cada pedido pendiente, intenta subirlo a Odoo.
// Si va, marca synced (y guarda el odooId/name devueltos).
// Si falla por error de servidor, marca error (con el mensaje) — el comercial
// puede reintentar manualmente desde la pantalla de pendientes.
//
// Si falla por red (offline), deja en pending y aborta el drenaje.

import { api } from '../api';
import { outboxList, outboxUpdate, onOutboxChange } from './db';
import { getOnlineState, onOnlineChange } from './online';

let _draining = false;

export async function drainOutbox() {
  if (_draining) return;
  if (getOnlineState() !== 'online') return;
  _draining = true;
  try {
    const all = await outboxList();
    // Solo intentamos los `pending`. Los `error` esperan acción manual.
    const pending = all
      .filter(e => e.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const entry of pending) {
      await outboxUpdate(entry.id, { status: 'syncing', error: null });
      try {
        let result;
        if (entry.mode === 'update' && entry.orderId) {
          result = await api.updateOrder(entry.orderId, entry.payload);
        } else {
          result = await api.createOrder(entry.payload);
        }
        await outboxUpdate(entry.id, {
          status: 'synced',
          syncedAt: Date.now(),
          syncedOdooId: result?.odooId || result?.id || null,
          syncedOrderName: result?.name || null,
        });
      } catch (e) {
        // Si es error de red (offline), volvemos a pending y paramos el drenaje
        // (no tiene sentido seguir intentando).
        const isNetwork = e?.name === 'TypeError' || /fetch|network|failed/i.test(e?.message || '');
        if (isNetwork) {
          await outboxUpdate(entry.id, { status: 'pending', error: null });
          break;
        }
        // Error de servidor (validación, conflicto, etc.) — marcar error.
        await outboxUpdate(entry.id, { status: 'error', error: e.message || String(e) });
      }
    }
  } finally {
    _draining = false;
  }
}

// Reintenta una entry concreta marcada como 'error' (la pone a pending y drena).
export async function retryOutboxEntry(id) {
  await outboxUpdate(id, { status: 'pending', error: null });
  await drainOutbox();
}

// Auto-drena cuando volvemos online.
export function startAutoSync() {
  // Drena al arrancar si ya estamos online.
  if (getOnlineState() === 'online') drainOutbox();
  // Cada vez que volvemos online.
  onOnlineChange((s) => { if (s === 'online') drainOutbox(); });
  // Cuando llega un cambio externo a la outbox (p.ej. añadido nuevo).
  onOutboxChange(() => { if (getOnlineState() === 'online') drainOutbox(); });
}
