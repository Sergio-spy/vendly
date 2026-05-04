// Pre-cacheo de imágenes del catálogo: dispara peticiones en segundo plano para
// que el SW (CacheFirst) las guarde sin bloquear la UI. Así, al ir offline o al
// cargar el catálogo por primera vez, las imágenes ya están listas.

import { productImageUrl } from '../api';

const CONCURRENCY = 6;

let _running = false;
export async function prefetchProductImages(products) {
  if (_running) return;
  if (!Array.isArray(products) || !products.length) return;
  _running = true;
  // Una sola URL por producto (templateId), porque la tarjeta usa templateId.
  const urls = products
    .filter(p => p.templateId)
    .map(p => productImageUrl({ templateId: p.templateId }))
    .filter(Boolean);

  // Pool de N descargas concurrentes. Errores se ignoran (mejor que rotura).
  const queue = [...urls];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const u = queue.shift();
      try {
        // priority hint para no competir con peticiones de UI activas.
        await fetch(u, { credentials: 'same-origin', priority: 'low', cache: 'force-cache' });
      } catch { /* offline o lo que sea: el SW maneja, seguimos */ }
    }
  });
  try { await Promise.all(workers); } finally { _running = false; }
}
