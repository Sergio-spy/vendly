import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { api } from '../api';

// Modal de alta o edición de cliente.
// - Si recibe `client` con datos, modo edición (PUT).
// - Si no, modo alta (POST).
// Llama a onSaved con el resultado para que el padre refresque la lista.
export function ClientForm({ open, mode = 'create', client, tariffs = [], onClose, onSaved }) {
  const isEdit = mode === 'edit' && client?.odooId;
  const [name, setName]     = useState('');
  const [ref, setRef]       = useState('');
  const [vat, setVat]       = useState('');
  const [city, setCity]     = useState('');
  const [street, setStreet] = useState('');
  const [phone, setPhone]   = useState('');
  const [tariffId, setTariffId] = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    if (isEdit) {
      setName(client.name || '');
      setRef(client.code || '');
      setVat(client.cif || '');
      setCity(client.city || '');
      // address es "calle · piso" en el mapper, así que lo dejamos vacío al editar
      // y el comercial puede sobrescribir si lo necesita.
      setStreet('');
      setPhone(client.phone || '');
      // Buscar tariff por nombre actual
      const t = tariffs.find(x => x.name === client.tariff);
      setTariffId(t?.odooId ? String(t.odooId) : '');
    } else {
      setName(''); setRef(''); setVat(''); setCity(''); setStreet(''); setPhone(''); setTariffId('');
    }
  }, [open, isEdit, client?.odooId]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) { setErr('El nombre es obligatorio'); return; }
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: name.trim(),
        ref: ref.trim() || undefined,
        vat: vat.trim() || undefined,
        city: city.trim() || undefined,
        street: street.trim() || undefined,
        phone: phone.trim() || undefined,
        pricelistId: tariffId ? Number(tariffId) : undefined,
      };
      if (isEdit) {
        await api.updateClient({ odooId: client.odooId, ...payload });
      } else {
        await api.createClient(payload);
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 560, maxHeight:'90vh' }}>
        <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
          <div className="t-h2">{isEdit ? 'Editar cliente' : 'Alta de cliente'}</div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div style={{ padding: 22, overflowY:'auto' }}>
          {err && <div className="t-small" style={{ color:'var(--danger)', marginBottom: 12 }}>{err}</div>}
          <div className="vstack" style={{ gap: 12 }}>
            <div className="field">
              <label>Nombre / Razón social *</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} autoFocus/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Referencia interna</label>
                <input className="input" value={ref} onChange={e=>setRef(e.target.value)} placeholder="Ej. 10245"/>
              </div>
              <div className="field">
                <label>CIF / NIF</label>
                <input className="input" value={vat} onChange={e=>setVat(e.target.value)} placeholder="B-12345678"/>
              </div>
            </div>
            <div className="field">
              <label>Dirección</label>
              <input className="input" value={street} onChange={e=>setStreet(e.target.value)} placeholder="Calle, número, piso"/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Ciudad</label>
                <input className="input" value={city} onChange={e=>setCity(e.target.value)}/>
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input className="input" value={phone} onChange={e=>setPhone(e.target.value)}/>
              </div>
            </div>
            <div className="field">
              <label>Tarifa</label>
              <select className="input" value={tariffId} onChange={e=>setTariffId(e.target.value)}>
                <option value="">— Sin tarifa específica —</option>
                {tariffs.map(t => (
                  <option key={t.id} value={t.odooId || ''}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="hstack" style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <div className="spacer"/>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            <Icon name="check" size={14}/> {busy ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear cliente')}
          </button>
        </div>
      </div>
    </>
  );
}
