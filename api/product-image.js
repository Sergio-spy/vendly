// GET /api/product-image?id=123          (variante: product.product)
// GET /api/product-image?templateId=123   (plantilla: product.template)
// Devuelve la imagen como binario, cacheada 24h en navegador.

import { MOCK_MODE, call } from './_lib/odoo.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!(await requireComercial(req, res))) return;
  const id = parseInt(req.query?.id, 10);
  const templateId = parseInt(req.query?.templateId, 10);
  if (!id && !templateId) return res.status(400).json({ error: 'Falta id o templateId' });

  if (MOCK_MODE) return res.status(404).end();

  const model = templateId ? 'product.template' : 'product.product';
  const target = templateId || id;

  // ?size=128|256|512|1024 — más pequeño en mosaicos y miniaturas, full en
  // hero del modal. Default 512 mantiene compatibilidad con clientes viejos.
  const sizeParam = String(req.query?.size || '512');
  const allowedSizes = ['128','256','512','1024'];
  const size = allowedSizes.includes(sizeParam) ? sizeParam : '512';
  const field = `image_${size}`;

  try {
    const rows = await call(model, 'read', [[target], [field]]);
    const b64 = rows?.[0]?.[field];
    if (!b64) {
      // Sin imagen → 404 corto cacheado, así el navegador no reintenta cada vez.
      // s-maxage hace que el CDN de Vercel cachee también el 404.
      res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
      return res.status(404).end();
    }

    const buf = Buffer.from(b64, 'base64');
    // Detectar formato por magic bytes (Odoo guarda original).
    let type = 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50) type = 'image/png';
    else if (buf[0] === 0x47 && buf[1] === 0x49) type = 'image/gif';
    else if (buf[0] === 0x52 && buf[1] === 0x49) type = 'image/webp';

    res.setHeader('Content-Type', type);
    // Browser 1 día, CDN Vercel 30 días con stale-while-revalidate 1 día.
    // Resultado: tras la primera petición de cada producto, cualquier comercial
    // recibe la imagen instantáneamente desde el edge sin pasar por la lambda.
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400');
    res.setHeader('Content-Length', String(buf.length));
    res.status(200).end(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
