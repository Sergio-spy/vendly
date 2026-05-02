import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { api } from '../api';

const PROGRAM_TYPES = [
  { value: 'promotion',         label: 'Promoción' },
  { value: 'coupons',           label: 'Cupones' },
  { value: 'loyalty',           label: 'Fidelización' },
  { value: 'gift_card',         label: 'Tarjeta regalo' },
  { value: 'ewallet',           label: 'E-wallet' },
  { value: 'next_order_coupons', label: 'Cupón próximo pedido' },
  { value: 'buy_x_get_y',       label: 'Compra X consigue Y' },
];

export function PromosAdmin({ onRefresh }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null=cerrado, {} = nuevo, promo = editar

  const load = async () => {
    setLoading(true);
    try { setPromos(await api.promos()); }
    catch { setPromos([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSaved = async () => {
    await load();
    onRefresh?.();
  };

  const onArchive = async (p) => {
    if (!confirm(`¿Archivar "${p.title}"?`)) return;
    try { await api.deletePromo(p.odooId); await load(); onRefresh?.(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack">
        <div className="t-display">Promociones</div>
        <div className="spacer"/>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <Icon name="sync" size={14}/> {loading ? 'Cargando…' : 'Recargar'}
        </button>
        <button className="btn btn-primary" onClick={()=>setEditing({})}>
          <Icon name="plus" size={14}/> Nueva promoción
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr>
            <th>Nombre</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th className="num">Cupones</th><th></th>
          </tr></thead>
          <tbody>
            {promos.map(p => {
              const typeLabel = PROGRAM_TYPES.find(t => t.value === p.kind)?.label || p.kind || '—';
              return (
                <tr key={p.id}>
                  <td className="bold">{p.title}</td>
                  <td className="muted">{typeLabel}</td>
                  <td className="tabular muted">{p.start || '—'}</td>
                  <td className="tabular muted">{p.end || '—'}</td>
                  <td className="num tabular">{p.stock}</td>
                  <td onClick={e=>e.stopPropagation()} style={{ whiteSpace:'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" title="Editar" onClick={()=>setEditing(p)}>
                      <Icon name="edit" size={14}/>
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Archivar" onClick={()=>onArchive(p)} style={{ marginLeft: 4, color:'var(--danger)' }}>
                      <Icon name="trash" size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
            {promos.length === 0 && !loading && (
              <tr><td colSpan={6} className="muted t-small" style={{ padding:'18px 22px', textAlign:'center' }}>
                Sin promociones activas.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PromoForm
        open={editing !== null}
        promo={editing && Object.keys(editing).length > 0 ? editing : null}
        onClose={()=>setEditing(null)}
        onSaved={onSaved}
      />
    </div>
  );
}

function PromoForm({ open, promo, onClose, onSaved }) {
  const isEdit = !!promo?.odooId;
  const [name, setName]               = useState('');
  const [programType, setProgramType] = useState('promotion');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [busy, setBusy]               = useState(false);
  const [err, setErr]                 = useState(null);

  useEffect(() => {
    if (!open) return;
    setErr(null); setBusy(false);
    if (isEdit) {
      setName(promo.title || '');
      setProgramType(promo.kind || 'promotion');
      setDateFrom(promo.start || '');
      setDateTo(promo.end || '');
    } else {
      setName(''); setProgramType('promotion'); setDateFrom(''); setDateTo('');
    }
  }, [open, promo?.odooId]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) { setErr('El nombre es obligatorio'); return; }
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: name.trim(),
        programType,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      };
      if (isEdit) await api.updatePromo({ odooId: promo.odooId, ...payload });
      else        await api.createPromo(payload);
      onSaved?.();
      onClose?.();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 540 }}>
        <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
          <div className="t-h2">{isEdit ? 'Editar promoción' : 'Nueva promoción'}</div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div style={{ padding: 22 }}>
          {err && <div className="t-small" style={{ color:'var(--danger)', marginBottom: 12 }}>{err}</div>}
          <div className="vstack" style={{ gap: 12 }}>
            <div className="field">
              <label>Nombre *</label>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} autoFocus placeholder="Ej. 2x1 verano"/>
            </div>
            <div className="field">
              <label>Tipo</label>
              <select className="input" value={programType} onChange={e=>setProgramType(e.target.value)}>
                {PROGRAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Desde</label>
                <input className="input" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              </div>
              <div className="field">
                <label>Hasta</label>
                <input className="input" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              </div>
            </div>
            <div className="t-small muted">
              Reglas, recompensas y productos aplicables se gestionan desde Odoo (loyalty.program). Aquí puedes crear, renombrar y archivar.
            </div>
          </div>
        </div>
        <div className="hstack" style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface-2)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <div className="spacer"/>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            <Icon name="check" size={14}/> {busy ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear')}
          </button>
        </div>
      </div>
    </>
  );
}
