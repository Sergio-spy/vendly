// IndexedDB para Vendly (modo offline).
// Dos object stores:
//   - cache: kv simple para snapshots (key=string, value=any).
//   - outbox: pedidos creados sin red, esperando subir a Odoo.
//     Cada entry: { id, payload, status, error?, createdAt, syncedAt? }
//     status: 'pending' | 'syncing' | 'synced' | 'error'

import { openDB } from 'idb';

const DB_NAME = 'vendly';
const DB_VERSION = 1;

let _dbPromise = null;
function getDb() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const os = db.createObjectStore('outbox', { keyPath: 'id' });
          os.createIndex('status', 'status');
          os.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return _dbPromise;
}

// ── Cache (snapshot del bootstrap) ─────────────────────────────────
export async function cacheGet(key) {
  return (await getDb()).get('cache', key);
}
export async function cacheSet(key, value) {
  return (await getDb()).put('cache', value, key);
}
export async function cacheDelete(key) {
  return (await getDb()).delete('cache', key);
}

// ── Outbox (pedidos pendientes de subir) ───────────────────────────
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'pending-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export async function outboxAdd({ payload, mode = 'create', orderId = null }) {
  const entry = {
    id: uuid(),
    mode,         // 'create' | 'update'
    orderId,      // odoo id si mode === 'update'
    payload,
    status: 'pending',
    error: null,
    createdAt: Date.now(),
    syncedAt: null,
    syncedOdooId: null,
    syncedOrderName: null,
  };
  await (await getDb()).put('outbox', entry);
  notifyChange();
  return entry;
}

export async function outboxList() {
  return (await getDb()).getAll('outbox');
}

export async function outboxPending() {
  const all = await outboxList();
  return all.filter(e => e.status === 'pending' || e.status === 'error');
}

export async function outboxCountPending() {
  const all = await outboxList();
  return all.filter(e => e.status === 'pending' || e.status === 'syncing' || e.status === 'error').length;
}

export async function outboxUpdate(id, patch) {
  const db = await getDb();
  const cur = await db.get('outbox', id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  await db.put('outbox', next);
  notifyChange();
  return next;
}

export async function outboxRemove(id) {
  await (await getDb()).delete('outbox', id);
  notifyChange();
}

// Eventos: la UI puede escuchar para refrescar contadores.
const listeners = new Set();
export function onOutboxChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notifyChange() { for (const fn of listeners) { try { fn(); } catch {} } }
