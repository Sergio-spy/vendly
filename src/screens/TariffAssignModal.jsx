import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { api } from '../api';

// Modal de asignación de una tarifa a varios clientes.
// Precarga las casillas según la tarifa actual de cada cliente.
export function TariffAssignModal({ open, tariff, clients = [], onClose, onSaved }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open || !tariff) return;
    setErr(null); setBusy(false); setQ('');
    // Pre-marcar los que ya tienen esta tarifa
    const initial = new Set(
      clients.filter(c => c.tariff === tariff.name && c.odooId).map(c => c.odooId)
    );
    setSelected(initial);
  }, [open, tariff?.id]);

  const filt = useMemo(() => {
    const term = q.toLowerCase();
    return clients
      .filter(c => c.odooId)
      .filter(c => !term || (c.name + c.code + c.city).toLowerCase().includes(term));
  }, [clients, q]);

  if (!open || !tariff) return null;

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!tariff.odooId) { setErr('Esta tarifa no tiene odooId'); return; }
    setBusy(true); setErr(null);
    try {
      await api.assignTariff({
        tariffOdooId: tariff.odooId,
        clientOdooIds: [...selected],
      });
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
      <div className="modal" style={{ width: 620, maxHeight:'90vh' }}>
        <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div className="t-tiny">ASIGNAR TARIFA</div>
            <div className="t-h2">{tariff.name}</div>
          </div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div style={{ padding: '16px 22px 0' }}>
          <div className="input-wrap">
            <Icon name="search" size={16} className="lead" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
            <input className="input input-search" placeholder="Buscar cliente…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <div className="t-small" style={{ marginTop: 10, color:'var(--ink-3)' }}>
            {selected.size} seleccionado{selected.size === 1 ? '' : 's'} · {filt.length} cliente{filt.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ padding:'10px 22px', overflowY:'auto', flex: 1 }}>
          {err && <div className="t-small" style={{ color:'var(--danger)', marginBottom: 10 }}>{err}</div>}
          <div className="vstack" style={{ gap: 6 }}>
            {filt.map(c => {
              const checked = selected.has(c.odooId);
              return (
                <label key={c.id} className="hstack" style={{ padding: '8px 10px', border:'1px solid var(--border)', borderRadius:'var(--r-2)', cursor:'pointer', gap: 12, background: checked ? 'var(--brand-50)' : 'var(--surface)' }}>
                  <input type="checkbox" checked={checked} onChange={()=>toggle(c.odooId)} style={{ accentColor:'var(--brand-500)' }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                    <div className="t-small">#{c.code} · {c.city || '—'}</div>
                  </div>
                  {c.tariff && c.tariff !== tariff.name && (
                    <span className="tag tag-neutral">Actual: {c.tariff}</span>
                  )}
                </label>
              );
            })}
            {filt.length === 0 && <div className="muted t-small" style={{ padding: 20, textAlign:'center' }}>Sin clientes</div>}
          </div>
        </div>
        <div className="hstack" style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <div className="spacer"/>
          <button className="btn btn-primary" onClick={submit} disabled={busy || selected.size === 0}>
            <Icon name="check" size={14}/> {busy ? 'Asignando…' : `Asignar a ${selected.size} cliente${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </>
  );
}
