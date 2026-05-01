import { MOCK_MODE, pingAuth } from './_lib/odoo.js';

export default async function handler(req, res) {
  const expiresAt = process.env.ODOO_API_KEY_EXPIRES_AT || null; // formato YYYY-MM-DD
  let apiKeyDaysLeft = null;
  if (expiresAt) {
    const ms = new Date(expiresAt + 'T00:00:00Z').getTime() - Date.now();
    apiKeyDaysLeft = Math.floor(ms / 86_400_000);
  }

  let odooAuth = null; // 'ok' | 'fail' | null (mock)
  if (!MOCK_MODE) {
    try {
      odooAuth = (await pingAuth()) ? 'ok' : 'fail';
    } catch {
      odooAuth = 'fail';
    }
  }

  res.status(200).json({
    ok: true,
    mode: MOCK_MODE ? 'mock' : 'odoo',
    odooUrl: process.env.ODOO_URL || null,
    odooDb: process.env.ODOO_DB || null,
    odooAuth,
    apiKeyExpiresAt: expiresAt,
    apiKeyDaysLeft,
    time: new Date().toISOString(),
  });
}
