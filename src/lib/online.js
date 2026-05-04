// Detector de conectividad para Vendly.
// `navigator.onLine` es poco fiable (se basa en si hay tarjeta de red activa),
// así que también hacemos ping ocasional al backend cuando el usuario hace
// una operación. Resultado: estado `online | offline` con eventos.

import { useEffect, useState } from 'react';

const listeners = new Set();
let _state = typeof navigator !== 'undefined' && navigator.onLine !== false ? 'online' : 'offline';

function setState(next) {
  if (next === _state) return;
  _state = next;
  for (const fn of listeners) { try { fn(_state); } catch {} }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online',  () => setState('online'));
  window.addEventListener('offline', () => setState('offline'));
}

export function getOnlineState() { return _state; }
export function onOnlineChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setOnlineFromError(err) {
  // Si una request falla por red (cubre los mensajes de Chrome/Safari/Firefox),
  // marcamos offline. "Load failed" en Safari, "Failed to fetch" en Chrome,
  // "NetworkError when attempting to fetch resource." en Firefox.
  if (!err) return;
  if (err.name === 'TypeError') { setState('offline'); return; }
  const m = String(err.message || err).toLowerCase();
  if (/failed to fetch|networkerror|network error|load failed|fetch failed|no internet/.test(m)) {
    setState('offline');
  }
}
export function setOnlineFromSuccess() {
  // Cualquier respuesta del backend confirma que estamos online.
  if (_state !== 'online') setState('online');
}

// Hook para componentes
export function useOnline() {
  const [state, setSt] = useState(_state);
  useEffect(() => onOnlineChange(setSt), []);
  return state === 'online';
}
