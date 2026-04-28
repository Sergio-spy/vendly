import { MOCK_MODE } from './_lib/odoo.js';
import { PROMOS } from './_lib/mock.js';

export default async function handler(req, res) {
  // Promos en Odoo viven en sale.coupon.program / loyalty.program (depende de versión).
  // En la mayoría de instancias se gestionan a mano: empezamos sirviendo mock siempre,
  // y en una segunda fase se mapea contra el modelo real cuando confirmemos qué módulo usas.
  if (MOCK_MODE) return res.status(200).json(PROMOS);
  res.status(200).json(PROMOS); // TODO: leer de loyalty.program o sale.coupon.program
}
