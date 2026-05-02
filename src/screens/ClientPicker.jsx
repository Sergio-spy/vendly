import { useState } from 'react';
import { Icon } from '../components/Icon';
import { eur } from '../lib/format';

export function ClientPicker({ open, onClose, clients = [], current, onPick }) {
  const [q, setQ] = useState('');
  if (!open) return null;
  const filt = clients.filter(c => (c.name + c.code + c.city).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 640, height: 580 }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
          <div className="hstack" style={{ marginBottom: 14 }}>
            <div className="t-h1">Seleccionar cliente</div>
            <div className="spacer"/>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
          </div>
          <div className="input-wrap">
            <Icon name="search" size={16} style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }} className="lead"/>
            <input className="input input-search" placeholder="Buscar por nombre, código o ciudad" autoFocus value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>
        <div className="drawer-body" style={{ padding: 8 }}>
          {filt.map(c => (
            <button key={c.id}
              onClick={() => { onPick(c); onClose(); }}
              className="hstack"
              style={{ width:'100%', padding: 12, borderRadius: 'var(--r-2)', border:'none', background: current?.id===c.id?'var(--brand-50)':'transparent', textAlign:'left', gap: 12, cursor:'pointer' }}>
              <div className="avatar lg">{c.code.slice(-2)}</div>
              <div style={{ flex:1 }}>
                <div className="hstack" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{c.name}</span>
                  {c.balance > 0 && <span className="tag tag-warn">saldo {eur(c.balance)}</span>}
                </div>
                <div className="t-small">#{c.code} · {c.city} · CIF {c.cif}</div>
              </div>
              <span className="tag tag-info" style={{ background:'var(--surface-3)', color:'var(--ink-2)' }}>{c.tariff}</span>
              {current?.id===c.id && <Icon name="check" size={18} style={{ color: 'var(--brand-600)' }}/>}
            </button>
          ))}
        </div>
        <div className="drawer-foot hstack">
          <div className="muted">{filt.length} clientes</div>
          <div className="spacer"/>
          <button className="btn btn-secondary"><Icon name="plus" size={14}/> Nuevo cliente</button>
        </div>
      </div>
    </>
  );
}
