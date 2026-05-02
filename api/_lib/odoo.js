// Cliente JSON-RPC para Odoo SaaS / OnPremise.
// Usa el endpoint /jsonrpc (External API) con autenticación por API Key (Odoo 14+).
// Variables de entorno:
//   ODOO_URL     ej. https://miempresa.odoo.com
//   ODOO_DB      nombre de la base de datos
//   ODOO_USER    usuario (login) del comercial técnico / API
//   ODOO_API_KEY API Key generada en el perfil del usuario en Odoo
//
// Si falta cualquiera de estas variables, el módulo entra en modo mock
// (devuelve datos de prueba) para que la app siga viva.

const url = process.env.ODOO_URL;
const db  = process.env.ODOO_DB;
const usr = process.env.ODOO_USER;
const key = process.env.ODOO_API_KEY;

export const MOCK_MODE = !(url && db && usr && key);

let cachedUid = null;
let authPromise = null; // promesa compartida de authenticate() para queries concurrentes

async function jsonRpc(path, params) {
  // Reintenta hasta 3 veces (0/500/1500ms backoff) si Odoo responde con HTML
  // (rate-limit, 502, mantenimiento) o si la red rebota. Una vez la respuesta
  // es JSON válido, dejamos de reintentar y devolvemos el resultado / error.
  const delays = [0, 500, 1500];
  let lastErr = null;
  for (const d of delays) {
    if (d) await new Promise(r => setTimeout(r, d));
    try {
      const r = await fetch(`${url}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
      });
      const text = await r.text();
      let j;
      try {
        j = JSON.parse(text);
      } catch {
        // Cuerpo no-JSON (HTML, vacío, etc.) → probablemente rate-limit transitorio.
        throw new Error(`Odoo respondió no-JSON (HTTP ${r.status}); reintentando…`);
      }
      if (j.error) {
        // Error JSON-RPC bien formado: NO reintentamos, es un error de aplicación.
        throw new Error(j.error.data?.message || j.error.message || 'Odoo error');
      }
      return j.result;
    } catch (e) {
      lastErr = e;
      // Si es un error JSON-RPC formal, no reintentar.
      if (/^Odoo respondió no-JSON/.test(e.message) === false &&
          /Odoo error|fetch failed|network/i.test(e.message) === false) {
        throw e;
      }
    }
  }
  throw lastErr;
}

async function authenticate() {
  if (cachedUid) return cachedUid;
  // Si ya hay una autenticación en curso (otra query la disparó), reusamos
  // su promesa: una sola petición a Odoo aunque vengan N llamadas en paralelo.
  // El retry contra HTML / rate-limit lo gestiona jsonRpc internamente.
  if (authPromise) return authPromise;
  authPromise = jsonRpc('/jsonrpc', {
    service: 'common',
    method: 'authenticate',
    args: [db, usr, key, {}],
  }).then(uid => {
    if (!uid) throw new Error('Autenticación Odoo fallida (revisa ODOO_USER / ODOO_API_KEY).');
    cachedUid = uid;
    return uid;
  }).catch(e => {
    authPromise = null; // permitir reintento en la siguiente request
    throw e;
  });
  return authPromise;
}

// Envuelve execute_kw — la única llamada que realmente vas a usar.
export async function call(model, method, args = [], kwargs = {}) {
  if (MOCK_MODE) throw new Error('MOCK_MODE: no Odoo configurado');
  const uid = await authenticate();
  return jsonRpc('/jsonrpc', {
    service: 'object',
    method: 'execute_kw',
    args: [db, uid, key, model, method, args, kwargs],
  });
}

// Ping de auth: hace un authenticate fresco contra Odoo y devuelve true si la API key responde.
// No usa la caché, así detecta inmediatamente si las credenciales han caducado/se han revocado.
export async function pingAuth() {
  if (MOCK_MODE) return null;
  try {
    const uid = await jsonRpc('/jsonrpc', {
      service: 'common',
      method: 'authenticate',
      args: [db, usr, key, {}],
    });
    return !!uid;
  } catch {
    return false;
  }
}

// Atajos cómodos
export const search_read = (model, domain = [], fields = [], opts = {}) =>
  call(model, 'search_read', [domain, fields], opts);

export const create = (model, vals) => call(model, 'create', [vals]);
export const write  = (model, ids, vals) => call(model, 'write', [ids, vals]);
