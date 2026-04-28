import { MOCK_MODE } from './_lib/odoo.js';

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    mode: MOCK_MODE ? 'mock' : 'odoo',
    odooUrl: process.env.ODOO_URL || null,
    odooDb: process.env.ODOO_DB || null,
    time: new Date().toISOString(),
  });
}
