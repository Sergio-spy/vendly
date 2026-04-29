import { MOCK_MODE } from './_lib/odoo.js';
import { PROMOS } from './_lib/mock.js';
import { requireComercial } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireComercial(req, res)) return;
  if (MOCK_MODE) return res.status(200).json(PROMOS);
  res.status(200).json(PROMOS); // TODO: leer de loyalty.program o sale.coupon.program
}
