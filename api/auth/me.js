import { requireComercial } from '../_lib/auth.js';

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  res.status(200).json({
    id: c.id, name: c.name, firstName: c.firstName,
    initials: c.initials, zone: c.zone, email: c.email,
    role: c.role || 'comercial',
    odooTagId: c.odooTagId,
  });
}
