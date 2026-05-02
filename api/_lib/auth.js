// Autenticación: hashing de password (scrypt) + tokens firmados (HMAC-SHA256).
// Sin dependencias externas: solo node:crypto. JWT-like pero más sencillo.

import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { loadComerciales } from './comerciales.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';

// ── Password ──────────────────────────────────────────────────────
export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const test = scryptSync(plain, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== test.length) return false;
  return timingSafeEqual(expected, test);
}

// ── Token (formato: base64url(payload).base64url(signature)) ───────
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function b64urlDecode(str) {
  return Buffer.from(str.replace(/-/g,'+').replace(/_/g,'/'), 'base64');
}

export function signToken(payload, expSeconds = 30 * 24 * 3600) {
  const exp = Math.floor(Date.now()/1000) + expSeconds;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  const sig = b64url(createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(body).digest();
  const got = b64urlDecode(sig);
  if (expected.length !== got.length) return null;
  if (!timingSafeEqual(expected, got)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Helpers para endpoints ────────────────────────────────────────
// Extrae el token: primero del header Authorization: Bearer ..., y si no, de ?token=
// (necesario para `<img src="/api/...">` que no manda headers).
export function tokenFromReq(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m) return m[1];
  return req.query?.token || null;
}

// Devuelve el comercial autenticado o null. Async porque consulta el merge
// archivo + KV (loadComerciales).
export async function comercialFromReq(req) {
  const payload = verifyToken(tokenFromReq(req));
  if (!payload) return null;
  const all = await loadComerciales();
  return all.find(c => c.id === payload.id) || null;
}

// Wrapper que rechaza con 401 si no hay sesión válida.
// Uso: const c = await requireComercial(req, res); if (!c) return;
export async function requireComercial(req, res) {
  const c = await comercialFromReq(req);
  if (!c) {
    res.status(401).json({ error: 'No autorizado' });
    return null;
  }
  return c;
}
