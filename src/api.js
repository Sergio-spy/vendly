// Wrapper de fetch para los endpoints /api/*.
// Maneja el token de sesión (Bearer en localStorage).

import { setOnlineFromError, setOnlineFromSuccess } from './lib/online';

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

  let r;
  try {
    r = await fetch(`/api${path}`, { ...opts, headers });
  } catch (e) {
    setOnlineFromError(e);
    throw e;
  }
  setOnlineFromSuccess();

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

// URL del PDF de la factura para usar en <a href> de descarga.
export function orderInvoiceUrl(orderOdooId) {
  if (!orderOdooId) return null;
  const t = auth.getToken();
  return `/api/order-invoice?orderId=${orderOdooId}${t ? '&token=' + encodeURIComponent(t) : ''}`;
}

// URL del PDF del pedido (presupuesto / detalle estilo Palomatic).
export function orderPdfUrl(orderOdooId) {
  if (!orderOdooId) return null;
  const t = auth.getToken();
  return `/api/order-pdf?id=${orderOdooId}${t ? '&token=' + encodeURIComponent(t) : ''}`;
}

// URL del Excel del pedido.
export function orderXlsxUrl(orderOdooId) {
  if (!orderOdooId) return null;
  const t = auth.getToken();
  return `/api/order-xlsx?id=${orderOdooId}${t ? '&token=' + encodeURIComponent(t) : ''}`;
}

// Versión global de imágenes — admin la bumpea desde la pantalla de admin.
// Cuando cambia, todas las URLs de productImageUrl llevan ese v y las cachés
// (browser, CDN, SW) revalidan. Se setea desde App.jsx tras el bootstrap.
let _imageVersion = '';
export function setImageVersion(v) { _imageVersion = v || ''; }
export function getImageVersion() { return _imageVersion; }

// URL para usar directamente en <img src>. Lleva el token en query.
// Acepta:
//   - número (id de variante product.product)
//   - { templateId } / { odooId } / { size } (size: 128 | 256 | 512 | 1024)
// El size se aplica solo si se pasa explícitamente; default backend = 512.
// `v` (opcional, override): versión específica. Si no se pasa, usa la global.
export function productImageUrl(odooIdOrParams, opts = {}) {
  const t = auth.getToken();
  const tokenQs = t ? '&token=' + encodeURIComponent(t) : '';
  const size = (opts.size && [128,256,512,1024].includes(opts.size)) ? `&size=${opts.size}` : '';
  const ver = opts.v || _imageVersion;
  const v = ver ? `&v=${encodeURIComponent(ver)}` : '';
  if (typeof odooIdOrParams === 'object' && odooIdOrParams) {
    if (odooIdOrParams.templateId) return `/api/product-image?templateId=${odooIdOrParams.templateId}${size}${v}${tokenQs}`;
    if (odooIdOrParams.odooId)     return `/api/product-image?id=${odooIdOrParams.odooId}${size}${v}${tokenQs}`;
    return null;
  }
  if (!odooIdOrParams) return null;
  return `/api/product-image?id=${odooIdOrParams}${size}${v}${tokenQs}`;
}

export const api = {
  // Auth
  login: (login, password) => req('/auth/login', { method:'POST', body: JSON.stringify({ login, password }) }),
  me:    () => req('/auth/me'),

  // Datos
  bootstrap: () => req('/bootstrap'),
  health:   () => req('/health'),
  products: (partnerId) => req(`/products${partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : ''}`),
  clients:  () => req('/clients'),
  tariffs:  () => req('/tariffs'),
  promos:   () => req('/promos'),
  orders:   () => req('/orders'),
  order:    (id) => req(`/order?id=${encodeURIComponent(id)}`),
  tags:     () => req('/tags'),
  families: () => req('/families'),

  // Variantes de un product.template
  variants: (templateId, partnerId) => req(`/product-variants?templateId=${encodeURIComponent(templateId)}${partnerId ? `&partnerId=${encodeURIComponent(partnerId)}` : ''}`),

  // KPI: range = 'day' | 'month'
  kpi: (range = 'day') => req(`/kpi?range=${encodeURIComponent(range)}`),

  // KPI agregado por comercial (admin); month en formato YYYY-MM
  adminKpi: (month) => req(`/admin-kpi${month ? `?month=${encodeURIComponent(month)}` : ''}`),

  // Desglose de facturas pendientes de un cliente (cobros)
  clientInvoices: (odooId) => req(`/client-invoices?id=${encodeURIComponent(odooId)}`),

  // Comerciales (admin)
  comerciales: () => req('/comerciales'),
  createComercial: (payload) => req('/comerciales', { method:'POST', body: JSON.stringify(payload) }),
  updateComercial: (payload) => req('/comerciales', { method:'PUT',  body: JSON.stringify(payload) }),
  deleteComercial: (id)      => req(`/comerciales?id=${encodeURIComponent(id)}`, { method:'DELETE' }),

  // Objetivos de venta
  goals:      () => req('/goals'),                 // (admin) tabla completa
  myGoal:     () => req('/goals?me=1'),            // del logueado
  setGoal:    (payload) => req('/goals', { method:'PUT', body: JSON.stringify(payload) }),

  // Comparador de tarifas
  comparePricelists: (payload) => req('/pricelist-compare', { method:'POST', body: JSON.stringify(payload) }),

  // Versión global de imágenes (admin)
  imagesVersion:      () => req('/images-version'),
  bumpImagesVersion:  () => req('/images-version', { method:'POST' }),

  // Mutaciones
  createOrder:  (payload) => req('/orders',  { method:'POST', body: JSON.stringify(payload) }),
  updateOrder:  (id, payload) => req(`/order?id=${encodeURIComponent(id)}`, { method:'PUT', body: JSON.stringify(payload) }),
  createClient: (payload) => req('/clients', { method:'POST', body: JSON.stringify(payload) }),
  updateClient: (payload) => req('/clients', { method:'PUT',  body: JSON.stringify(payload) }),
  deleteClient: (odooId)  => req(`/clients?odooId=${encodeURIComponent(odooId)}`, { method:'DELETE' }),
  assignTariff: (payload) => req('/assign-tariff', { method:'POST', body: JSON.stringify(payload) }),
  createTariff: (payload) => req('/tariffs', { method:'POST', body: JSON.stringify(payload) }),

  // Promos (admin)
  createPromo:  (payload) => req('/promos', { method:'POST', body: JSON.stringify(payload) }),
  updatePromo:  (payload) => req('/promos', { method:'PUT',  body: JSON.stringify(payload) }),
  deletePromo:  (odooId)  => req(`/promos?odooId=${encodeURIComponent(odooId)}`, { method:'DELETE' }),
};
