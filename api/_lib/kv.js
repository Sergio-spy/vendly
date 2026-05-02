// Cliente mínimo de Upstash Redis (la opción "Vercel KV" original) vía REST.
// Acepta tanto las env vars de la integración Upstash de Vercel
// (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) como las antiguas
// "Vercel KV" (KV_REST_API_URL, KV_REST_API_TOKEN). El protocolo es el mismo.
//
// Si no hay nada configurado, las funciones devuelven null para get y throw
// para set — así detectamos la falta de configuración sin depender de paquetes.

const URL_  = process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

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
