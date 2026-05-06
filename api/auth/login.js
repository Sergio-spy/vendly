import { loadComerciales } from '../_lib/comerciales.js';
import { verifyPassword, signToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Faltan login y password' });

  const all = await loadComerciales();
  const c = all.find(x => x.login.toLowerCase() === String(login).toLowerCase());
  if (!c || !verifyPassword(password, c.passwordHash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = signToken({ id: c.id });
  res.status(200).json({
    token,
    comercial: {
      id: c.id, name: c.name, firstName: c.firstName,
      initials: c.initials, zone: c.zone, email: c.email,
      role: c.role || 'comercial',
      portalPartnerId: c.portalPartnerId || null,
    },
  });
}
