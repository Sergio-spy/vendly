import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../api';

// Modal de alta o edición de comercial. En edición, password es opcional
// (si se deja vacío se mantiene la actual).
export function ComercialForm({ open, mode = 'create', comercial, onClose, onSaved }) {
  const isEdit = mode === 'edit' && comercial?.id;
  const [id, setId]               = useState('');
  const [login, setLogin]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [zone, setZone]           = useState('Comercial');
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState('comercial');
  const [odooTagId, setOdooTagId] = useState('');
  const [portalPartnerId, setPortalPartnerId] = useState('');
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState(null);

  useEffect(() => {
    if (!open) return;
    setErr(null); setBusy(false); setPassword('');
    if (isEdit) {
      setId(comercial.id || '');
      setLogin(comercial.login || '');
      setName(comercial.name || '');
      setZone(comercial.zone || 'Comercial');
      setEmail(comercial.email || '');
      setRole(comercial.role || 'comercial');
      setOdooTagId(comercial.odooTagId ?? '');
      setPortalPartnerId(comercial.portalPartnerId ?? '');
    } else {
      setId(''); setLogin(''); setName(''); setZone('Comercial');
      setEmail(''); setRole('comercial'); setOdooTagId(''); setPortalPartnerId('');
    }
  }, [open, comercial?.id, isEdit]);

  if (!open) return null;

  const submit = async () => {
    if (!isEdit && !id.trim())       { setErr('Falta id'); return; }
    if (!login.trim())               { setErr('Falta login'); return; }
    if (!name.trim())                { setErr('Falta nombre'); return; }
    if (!isEdit && !password)        { setErr('Falta password (mín 4 caracteres)'); return; }
    if (!isEdit && password.length < 4) { setErr('Password muy corta'); return; }
    setBusy(true); setErr(null);
    try {
      const payload = {
        id:        isEdit ? comercial.id : id.trim(),
        login:     login.trim(),
        password:  password || undefined,
        name:      name.trim(),
        firstName: name.trim().split(' ')[0],
        initials:  name.trim().split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase(),
        zone:      zone.trim() || 'Comercial',
        email:     email.trim() || '',
        role,
        odooTagId: odooTagId ? Number(odooTagId) : null,
        portalPartnerId: portalPartnerId ? Number(portalPartnerId) : null,
      };
      if (isEdit) await api.updateComercial(payload);
      else        await api.createComercial(payload);
      onSaved?.();
      onClose?.();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 580, maxHeight:'90vh' }}>
        <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
          <div className="t-h2">{isEdit ? `Editar comercial · ${comercial.name}` : 'Alta de comercial'}</div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div style={{ padding: 22, overflowY:'auto' }}>
          {err && <div className="t-small" style={{ color:'var(--danger)', marginBottom: 12 }}>{err}</div>}
          <div className="vstack" style={{ gap: 12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>ID interno *</label>
                <input className="input" value={id} onChange={e=>setId(e.target.value)} disabled={isEdit} placeholder="ej. ana"/>
                {!isEdit && <div className="t-small muted">Solo letras/dígitos. No editable después.</div>}
              </div>
              <div className="field">
                <label>Login *</label>
                <input className="input" value={login} onChange={e=>setLogin(e.target.value)} placeholder="ej. ana"/>
              </div>
            </div>
            <div className="field">
              <label>Nombre completo *</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="ej. Ana López"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Email</label>
                <input className="input" value={email} onChange={e=>setEmail(e.target.value)}/>
              </div>
              <div className="field">
                <label>Zona / Equipo</label>
                <input className="input" value={zone} onChange={e=>setZone(e.target.value)}/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Rol</label>
                <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
                  <option value="comercial">Comercial</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="field">
                <label>Etiqueta Odoo (id)</label>
                <input type="number" className="input" value={odooTagId} onChange={e=>setOdooTagId(e.target.value)} placeholder="ej. 35"/>
                <div className="t-small muted">Sin etiqueta = ve todos los clientes (admin).</div>
              </div>
            </div>
            <div className="field">
              <label>Portal cliente · res.partner ID Odoo</label>
              <input type="number" className="input" value={portalPartnerId} onChange={e=>setPortalPartnerId(e.target.value)} placeholder="dejar vacío para comercial normal"/>
              <div className="t-small muted">Si pones aquí el id de un cliente Odoo, este usuario entra en MODO PORTAL: solo ve catálogo + sus pedidos, sin tarifas ni admin. Útil para que un cliente final haga sus pedidos.</div>
            </div>
            <div className="field">
              <label>{isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
              <PasswordInput className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'mín. 4 caracteres'}/>
            </div>
          </div>
        </div>
        <div className="hstack" style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface-2)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <div className="spacer"/>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            <Icon name="check" size={14}/> {busy ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear comercial')}
          </button>
        </div>
      </div>
    </>
  );
}
