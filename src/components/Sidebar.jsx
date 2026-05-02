import { Icon } from './Icon';

export function Sidebar({ route, setRoute, salesman, orderCount, onLogout, collapsed = false }) {
  const isAdmin = salesman.role === 'admin';
  const items = [
    { id:'dashboard', label:'Inicio',        icon:'home' },
    { id:'catalog',   label:'Catálogo',      icon:'catalog' },
    { id:'orders',    label:'Pedidos',       icon:'orders', badge: orderCount },
    { id:'clients',   label:'Clientes',      icon:'clients' },
    { id:'tariffs',   label:'Tarifas',       icon:'tariffs' },
    { id:'promos',    label:'Promociones',   icon:'promo' },
    isAdmin && { id:'stock', label:'Stock',  icon:'stock' },
    { id:'collect',   label:'Cobros',        icon:'collect' },
    { id:'kpi',       label:'Mi rendimiento',icon:'kpi' },
  ].filter(Boolean);
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">V</div>
        {!collapsed && (
          <div>
            <div className="sb-name">Vendly</div>
            <div className="sb-tag">Venta comercial</div>
          </div>
        )}
      </div>

      {!collapsed && <div className="sb-section">Trabajo</div>}
      {items.map(i => (
        <button key={i.id} className="sb-item"
          data-active={String(route === i.id)}
          onClick={() => setRoute(i.id)}
          title={collapsed ? i.label : undefined}
          style={{ position: 'relative' }}>
          <Icon name={i.icon} size={18}/>
          {!collapsed && <span>{i.label}</span>}
          {i.badge ? <span className="badge">{i.badge}</span> : null}
        </button>
      ))}

      {isAdmin && (
        <>
          {!collapsed && <div className="sb-section">Sistema</div>}
          <button className="sb-item" data-active={String(route === 'admin')} onClick={() => setRoute('admin')} title={collapsed ? 'Admin' : undefined}>
            <Icon name="admin" size={18}/>{!collapsed && <span>Admin</span>}
          </button>
          <button className="sb-item" data-active={String(route === 'admin-promos')} onClick={() => setRoute('admin-promos')} title={collapsed ? 'Promociones' : undefined}>
            <Icon name="promo" size={18}/>{!collapsed && <span>Promociones</span>}
          </button>
          <button className="sb-item" data-active={String(route === 'admin-kpi')} onClick={() => setRoute('admin-kpi')} title={collapsed ? 'Análisis comerciales' : undefined}>
            <Icon name="kpi" size={18}/>{!collapsed && <span>Análisis comerciales</span>}
          </button>
        </>
      )}

      <div className="sb-foot">
        <div className="avatar" title={collapsed ? salesman.name : undefined}>{salesman.initials}</div>
        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{salesman.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{salesman.zone}</div>
          </div>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" title="Cerrar sesión" onClick={onLogout}><Icon name="logout" size={16}/></button>
      </div>
    </aside>
  );
}
