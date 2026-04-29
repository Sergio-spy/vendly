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
  tags:     () => req('/tags'),

  // Mutaciones
  createOrder:  (payload) => req('/orders',  { method:'POST', body: JSON.stringify(payload) }),
  createClient: (payload) => req('/clients', { method:'POST', body: JSON.stringify(payload) }),
};
