import { Icon } from './Icon';

export function Topbar({ title, client, setClientPickerOpen, online, lastSync, orderTotal, onOpenOrder, orderLines, onToggleSidebar }) {
  return (
    <header className="topbar">
      {onToggleSidebar && (
        <button className="tb-burger" onClick={onToggleSidebar} title="Mostrar/ocultar menú" aria-label="Mostrar/ocultar menú">
          <Icon name="menu" size={20}/>
        </button>
      )}
      <div className="tb-title">{title}</div>
      <span className="tag tag-neutral t-num tb-sync" style={{ marginLeft: 6 }}>
        <Icon name={online ? 'cloud' : 'wifi-off'} size={12}/> {online ? 'Sincronizado' : 'Offline'} · {lastSync}
      </span>
      <div className="tb-spacer"/>

      <button className="client-pill" onClick={() => setClientPickerOpen(true)}>
        {client ? (
          <>
            <div className="avatar">{client.code.slice(-2)}</div>
            <div className="pill-text">
              <span className="name">{client.name}</span>
              <span className="meta">#{client.code} · {client.tariff} · {client.city}</span>
            </div>
          </>
        ) : (
          <>
            <div className="avatar" style={{ background:'var(--surface-3)', color:'var(--ink-4)' }}><Icon name="clients" size={14}/></div>
            <div className="pill-text">
              <span className="name" style={{ color:'var(--ink-3)' }}>Seleccionar cliente</span>
              <span className="meta">Sin cliente activo</span>
            </div>
          </>
        )}
        <Icon name="chev-down" size={14} style={{ color: 'var(--ink-4)', marginLeft: 4, flexShrink: 0 }}/>
      </button>

      <button className="btn btn-ghost btn-icon tb-bell" title="Notificaciones"><Icon name="bell"/></button>

      {orderLines > 0 && (
        <button className="btn btn-primary tb-cart" onClick={onOpenOrder}>
          <Icon name="cart" size={16}/>
          <span className="t-num tb-cart-total">{orderTotal.toFixed(2)} €</span>
          <span className="tb-cart-count" style={{ background:'rgba(255,255,255,.25)', borderRadius:'999px', padding:'1px 7px', fontSize:11, marginLeft:2 }}>{orderLines}</span>
        </button>
      )}
    </header>
  );
}
