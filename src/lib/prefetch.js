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
  // Esperamos a que el navegador esté inactivo antes de empezar — así no
  // competimos con el render inicial del catálogo. Fallback a setTimeout.
  await new Promise(resolve => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(resolve, { timeout: 2000 });
    } else {
      setTimeout(resolve, 800);
    }
  });
  // Para cada producto:
  //   - URL del template (la usan las tarjetas single-variant y los multi cuando
  //     no hay imagen específica de variante).
  //   - URLs de las primeras 4 variantes en multi-variant: el mosaico 2x2 las
  //     muestra en la tarjeta del catálogo, así que conviene que estén listas
  //     antes de navegar y para offline.
  const urls = [];
  for (const p of products) {
    const v = p.imgV;
    if (p.templateId) urls.push(productImageUrl({ templateId: p.templateId }, { v }));
    if ((p.variantIds?.length || 0) > 1) {
      // Variantes en tamaño pequeño (image_128) — el mosaico 2x2 las muestra
      // en celdas chicas, con 128 ya se ven bien y la carga es ~10× más
      // ligera que con 512.
      for (const vid of p.variantIds.slice(0, 4)) {
        urls.push(productImageUrl(vid, { size: 128, v }));
      }
    }
  }
  const dedup = [...new Set(urls.filter(Boolean))];

  // Pool de N descargas concurrentes. Errores se ignoran (mejor que rotura).
  const queue = dedup;
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
