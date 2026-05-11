// POST /api/auth/magic-link
// Admin pide { comercialId } y recibe { url, expiresIn }.
// El URL es https://<host>/?magic=<token>; al abrirlo, el frontend extrae el
// token y lo guarda en sessionStorage, logueando al comercial sin necesidad
// de escribir contraseña. Útil cuando autofill/teclado del dispositivo le
// impide entrar con su password real.

import { requireComercial, signToken } from '../_lib/auth.js';
import { loadComerciales } from '../_lib/comerciales.js';

const TTL_SECONDS = 15 * 60; // 15 minutos

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  if (req.method !== 'POST') return res.status(405).end();

  const { comercialId } = req.body || {};
  if (!comercialId) return res.status(400).json({ error: 'Falta comercialId' });

  const all = await loadComerciales();
  const target = all.find(x => x.id === comercialId);
  if (!target) return res.status(404).json({ error: 'Comercial no encontrado' });

  const token = signToken({ id: target.id }, TTL_SECONDS);
  // Construimos el URL absoluto a partir del host de la request.
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = `${proto}://${host}/?magic=${encodeURIComponent(token)}`;
  res.status(200).json({
    url,
    token,
    expiresIn: TTL_SECONDS,
    comercial: { id: target.id, name: target.name, login: target.login },
  });
}
