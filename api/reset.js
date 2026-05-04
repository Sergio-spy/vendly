// GET /api/reset — devuelve una página HTML que desinstala el Service Worker,
// borra todas las cachés y recarga la app limpia. Pensado para arreglar
// instalaciones PWA con SW viejo cuando el cambio de SW no propaga solo.
//
// Como esta ruta está bajo /api/, está fuera del scope del SW (ver
// navigateFallbackDenylist) → la respuesta SIEMPRE viene del servidor, nunca
// de cache.

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.status(200).end(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vendly · Limpiando…</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #fff; color: #222; padding: 40px 24px; max-width: 480px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  p  { color: #555; line-height: 1.5; }
  .ok { color: #1d7f50; }
  .err { color: #c93b3b; }
  pre { background: #f6f6f6; border-radius: 8px; padding: 10px; font-size: 12px; overflow: auto; }
</style>
</head>
<body>
<h1>Vendly · Reseteando instalación</h1>
<p id="status">Limpiando datos locales…</p>
<pre id="log"></pre>
<script>
(async () => {
  const status = document.getElementById('status');
  const log = document.getElementById('log');
  const out = (s) => { log.textContent += s + '\\n'; };
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      out('Service Workers encontrados: ' + regs.length);
      for (const r of regs) {
        const ok = await r.unregister();
        out('  unregister ' + r.scope + ' → ' + ok);
      }
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      out('Cachés encontradas: ' + keys.length);
      for (const k of keys) {
        await caches.delete(k);
        out('  borrada ' + k);
      }
    }
    try { localStorage.removeItem('vendly_token'); } catch {}
    status.innerHTML = '<span class="ok">✓ Limpieza completada.</span> Volviendo a la app…';
    setTimeout(() => { location.replace('/?_v=' + Date.now()); }, 1200);
  } catch (e) {
    status.innerHTML = '<span class="err">✗ Error al limpiar:</span> ' + (e && e.message || e);
  }
})();
</script>
</body>
</html>`);
}
