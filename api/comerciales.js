// /api/comerciales — gestión de comerciales (admin)
//   GET     → lista merge archivo + KV (sin password hashes)
//   POST    → crear nuevo (guarda en KV)
//   PUT     → editar existente (override en KV)
//   DELETE  → archivar (KV: { archived: true })

import {
  COMERCIALES, loadComerciales, invalidateComercialesCache, COMERCIALES_KV_KEY,
} from './_lib/comerciales.js';
import { kvGet, kvSet, KV_ENABLED } from './_lib/kv.js';
import { hashPassword, requireComercial } from './_lib/auth.js';

function safe(c) {
  return {
    id:        c.id,
    login:     c.login,
    name:      c.name,
    firstName: c.firstName,
    initials:  c.initials,
    email:     c.email || '',
    zone:      c.zone || '',
    role:      c.role,
    odooTagId: c.odooTagId,
    archived:  c.archived || false,
  };
}

const FILE_IDS = new Set(COMERCIALES.map(c => c.id));

export default async function handler(req, res) {
  const c = await requireComercial(req, res);
  if (!c) return;
  if (c.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });

  try {
    if (req.method === 'GET') {
      const list = await loadComerciales();
      return res.status(200).json(list.map(safe));
    }

    if (!KV_ENABLED) {
      return res.status(503).json({ error: 'Vercel KV no configurado: imposible guardar cambios.' });
    }
    const overrides = (await kvGet(COMERCIALES_KV_KEY)) || {};

    if (req.method === 'POST') {
      const { id, login, password, name, firstName, initials, email, zone, role, odooTagId } = req.body || {};
      if (!id || !/^[a-z0-9_-]+$/i.test(id)) return res.status(400).json({ error: 'id inválido (alfanumérico)' });
      if (!login)    return res.status(400).json({ error: 'Falta login' });
      if (!password) return res.status(400).json({ error: 'Falta password' });
      if (!name)     return res.status(400).json({ error: 'Falta name' });
      if (FILE_IDS.has(id))   return res.status(409).json({ error: 'id reservado por archivo' });
      if (overrides[id])      return res.status(409).json({ error: 'id ya existe' });

      overrides[id] = {
        id, login, name,
        firstName:    firstName || name.split(' ')[0],
        initials:     initials  || name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase(),
        email:        email || '',
        zone:         zone || 'Comercial',
        role:         role === 'admin' ? 'admin' : 'comercial',
        odooTagId:    odooTagId ? Number(odooTagId) : null,
        passwordHash: hashPassword(password),
        createdAt:    new Date().toISOString(),
      };
      await kvSet(COMERCIALES_KV_KEY, overrides);
      invalidateComercialesCache();
      return res.status(200).json({ ok: true, comercial: safe(overrides[id]) });
    }

    if (req.method === 'PUT') {
      const { id, login, password, name, firstName, initials, email, zone, role, odooTagId } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Falta id' });
      const existsInFile = FILE_IDS.has(id);
      const ov = overrides[id] || (existsInFile ? { id } : null);
      if (!ov) return res.status(404).json({ error: 'Comercial no encontrado' });

      if (login !== undefined)     ov.login     = login;
      if (name !== undefined)      ov.name      = name;
      if (firstName !== undefined) ov.firstName = firstName;
      if (initials !== undefined)  ov.initials  = initials;
      if (email !== undefined)     ov.email     = email;
      if (zone !== undefined)      ov.zone      = zone;
      if (role !== undefined)      ov.role      = role === 'admin' ? 'admin' : 'comercial';
      if (odooTagId !== undefined) ov.odooTagId = odooTagId ? Number(odooTagId) : null;
      if (password)                ov.passwordHash = hashPassword(password);
      ov.updatedAt = new Date().toISOString();
      delete ov.archived;
      overrides[id] = ov;
      await kvSet(COMERCIALES_KV_KEY, overrides);
      invalidateComercialesCache();
      return res.status(200).json({ ok: true, comercial: safe({ ...COMERCIALES.find(c => c.id === id), ...ov }) });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '');
      if (!id) return res.status(400).json({ error: 'Falta id' });
      // No se puede borrar al propio admin que está logueado.
      if (id === c.id) return res.status(400).json({ error: 'No puedes archivarte a ti mismo' });
      overrides[id] = { ...(overrides[id] || {}), id, archived: true, archivedAt: new Date().toISOString() };
      await kvSet(COMERCIALES_KV_KEY, overrides);
      invalidateComercialesCache();
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
