// Wrapper sencillo de fetch para los endpoints /api/*.
// En dev Vite proxiea a localhost (ver vite.config.js).
// En producción Vercel sirve /api desde las serverless functions.

async function req(path, opts = {}) {
  const r = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export const api = {
  health:   ()              => req('/health'),
  products: ()              => req('/products'),
  clients:  ()              => req('/clients'),
  tariffs:  ()              => req('/tariffs'),
  promos:   ()              => req('/promos'),
  orders:   ()              => req('/orders'),
  createOrder: (payload)    => req('/orders', { method:'POST', body: JSON.stringify(payload) }),
};
