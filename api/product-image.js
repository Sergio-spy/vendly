// GET /api/product-image?id=123
// Devuelve la imagen del producto (campo image_512 de product.product) como binario.
// Se cachea 24h en navegador para que la galería no machaque a Odoo.

import { MOCK_MODE, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  const id = parseInt(req.query?.id, 10);
  if (!id) return res.status(400).json({ error: 'Falta id' });

  if (MOCK_MODE) return res.status(404).end();

  try {
    const rows = await call('product.product', 'read', [[id], ['image_512']]);
    const b64 = rows?.[0]?.image_512;
    if (!b64) {
      // Sin imagen → 404 corto cacheado, así el navegador no reintenta cada vez.
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(404).end();
    }

    const buf = Buffer.from(b64, 'base64');
    // Detectar formato por magic bytes (Odoo guarda original).
    let type = 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) type = 'image/png';
    else if (buf[0] === 0x47 && buf[1] === 0x49) type = 'image/gif';
    else if (buf[0] === 0x52 && buf[1] === 0x49) type = 'image/webp';

    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
    res.setHeader('Content-Length', String(buf.length));
    res.status(200).end(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
