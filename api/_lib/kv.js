// Cliente mínimo de Vercel KV (Upstash Redis) vía REST.
// Si las env vars no están definidas (KV_REST_API_URL, KV_REST_API_TOKEN),
// las funciones devuelven null para get y throw para set — útil para detectar
// configuración faltante sin depender del paquete @vercel/kv.

const URL_  = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export const KV_ENABLED = !!(URL_ && TOKEN);

export async function kvGet(key) {
  if (!KV_ENABLED) return null;
  const r = await fetch(`${URL_}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  if (!j || j.result == null) return null;
  try { return JSON.parse(j.result); } catch { return j.result; }
}

export async function kvSet(key, value) {
  if (!KV_ENABLED) throw new Error('Vercel KV no está configurado (faltan KV_REST_API_URL y KV_REST_API_TOKEN)');
  const r = await fetch(`${URL_}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!r.ok) throw new Error(`KV set falló: HTTP ${r.status}`);
}
