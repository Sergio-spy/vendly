import { Icon } from './Icon';

export function Topbar({ title, client, setClientPickerOpen, online, lastSync, orderTotal, onOpenOrder, orderLines }) {
  return (
    <header className="topbar">
      <div className="tb-title">{title}</div>
      <span className="tag tag-neutral t-num" style={{ marginLeft: 6 }}>
        <Icon name={online ? 'cloud' : 'wifi-off'} size={12}/> {online ? 'Sincronizado' : 'Offline'} · {lastSync}
      </span>
      <div className="tb-spacer"/>

      {client && (
        <button className="client-pill" onClick={() => setClientPickerOpen(true)}>
          <div className="avatar">{client.code.slice(-2)}</div>
          <div className="pill-text">
            <span className="name">{client.name}</span>
            <span className="meta">#{client.code} · {client.tariff} · {client.city}</span>
          </div>
          <Icon name="chev-down" size={14} style={{ color: 'var(--ink-4)', marginLeft: 4, flexShrink: 0 }}/>
        </button>
      )}

      <button className="btn btn-ghost btn-icon" title="Notificaciones"><Icon name="bell"/></button>

      {orderLines > 0 && (
        <button className="btn btn-primary" onClick={onOpenOrder}>
          <Icon name="cart" size={16}/>
          <span className="t-num">{orderTotal.toFixed(2)} €</span>
          <span style={{ background:'rgba(255,255,255,.25)', borderRadius:'999px', padding:'1px 7px', fontSize:11, marginLeft:2 }}>{orderLines}</span>
        </button>
      )}
    </header>
  );
}
