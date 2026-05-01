// Wrapper de fetch para los endpoints /api/*.
// Maneja el token de sesión (Bearer en localStorage).

const TOKEN_KEY = 'vendly_token';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const r = await fetch(`/api${path}`, { ...opts, headers });

  if (r.status === 401) {
    auth.clear();
    // Pequeño hack: emitimos un evento que App escucha para forzar login.
    window.dispatchEvent(new CustomEvent('vendly-logout'));
    throw new Error('No autorizado');
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return r.json();
}

// URL para usar directamente en <img src>. Lleva el token en query.
// Acepta o bien `odooId` (variante product.product) o `{templateId}` (plantilla).
export function productImageUrl(odooIdOrParams) {
  const t = auth.getToken();
  const tokenQs = t ? '&token=' + encodeURIComponent(t) : '';
  if (typeof odooIdOrParams === 'object' && odooIdOrParams) {
    if (odooIdOrParams.templateId) return `/api/product-image?templateId=${odooIdOrParams.templateId}${tokenQs}`;
    if (odooIdOrParams.odooId)     return `/api/product-image?id=${odooIdOrParams.odooId}${tokenQs}`;
    return null;
  }
  if (!odooIdOrParams) return null;
  return `/api/product-image?id=${odooIdOrParams}${tokenQs}`;
}

export const api = {
  // Auth
  login: (login, password) => req('/auth/login', { method:'POST', body: JSON.stringify({ login, password }) }),
  me:    () => req('/auth/me'),

  // Datos
  health:   () => req('/health'),
  products: () => req('/products'),
  clients:  () => req('/clients'),
  tariffs:  () => req('/tariffs'),
  promos:   () => req('/promos'),
  orders:   () => req('/orders'),
  order:    (id) => req(`/order?id=${encodeURIComponent(id)}`),
  tags:     () => req('/tags'),
  families: () => req('/families'),

  // Variantes de un product.template
  variants: (templateId) => req(`/product-variants?templateId=${encodeURIComponent(templateId)}`),

  // Mutaciones
  createOrder:  (payload) => req('/orders',  { method:'POST', body: JSON.stringify(payload) }),
  createClient: (payload) => req('/clients', { method:'POST', body: JSON.stringify(payload) }),
};
