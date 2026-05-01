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

async function jsonRpc(path, params) {
  const r = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.data?.message || j.error.message || 'Odoo error');
  return j.result;
}

async function authenticate() {
  if (cachedUid) return cachedUid;
  cachedUid = await jsonRpc('/jsonrpc', {
    service: 'common',
    method: 'authenticate',
    args: [db, usr, key, {}],
  });
  if (!cachedUid) throw new Error('Autenticación Odoo fallida (revisa ODOO_USER / ODOO_API_KEY).');
  return cachedUid;
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
