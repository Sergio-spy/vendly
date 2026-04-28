import { Icon, ProdGlyph } from '../components/Icon';

const KPI = {
  monthRevenue: 32420.50,
  monthGoal: 45000,
  monthOrders: 38,
  monthClients: 24,
  pendingOrders: 5,
  pendingCollections: 4150.20,
};

export function Dashboard({ setRoute, salesman, recentOrders, clients = [], promos = [], products = [] }) {
  const goalPct = Math.round(KPI.monthRevenue / KPI.monthGoal * 100);
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 24 }}>
      <div>
        <div className="t-tiny" style={{ marginBottom: 6 }}>Buenos días, {salesman.firstName}</div>
        <div className="t-display">Panel de hoy</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="hstack" style={{ justifyContent:'space-between', marginBottom: 14 }}>
            <div className="t-h3 muted">Venta del mes</div>
            <span className="tag tag-success">+12% vs mes anterior</span>
          </div>
          <div className="hstack" style={{ alignItems:'baseline', gap: 10, marginBottom: 18 }}>
            <div className="tabular" style={{ fontSize: 38, fontWeight: 700, letterSpacing:'-0.02em' }}>{KPI.monthRevenue.toLocaleString('es-ES',{minimumFractionDigits:2})} €</div>
            <div className="muted">de {KPI.monthGoal.toLocaleString('es-ES')} € objetivo</div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background:'var(--surface-3)', overflow:'hidden', marginBottom: 8 }}>
            <div style={{ height:'100%', width:`${goalPct}%`, background:'linear-gradient(90deg, var(--brand-400), var(--brand-600))', borderRadius: 999 }}/>
          </div>
          <div className="hstack" style={{ justifyContent:'space-between' }}>
            <div className="t-small">{goalPct}% del objetivo · 13 días restantes</div>
            <button className="btn btn-ghost btn-sm" onClick={()=>setRoute('kpi')}>Ver detalle <Icon name="chev-right" size={14}/></button>
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="t-h3 muted" style={{ marginBottom: 10 }}>Pedidos del mes</div>
          <div className="tabular" style={{ fontSize: 32, fontWeight: 700 }}>{KPI.monthOrders}</div>
          <div className="hstack" style={{ marginTop: 12, gap: 16 }}>
            <div><div className="tabular bold">{KPI.pendingOrders}</div><div className="t-small">por exportar</div></div>
            <div className="divider-v" style={{ height: 28 }}/>
            <div><div className="tabular bold">{KPI.monthClients}</div><div className="t-small">clientes activos</div></div>
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="t-h3 muted" style={{ marginBottom: 10 }}>Cobros pendientes</div>
          <div className="tabular" style={{ fontSize: 32, fontWeight: 700, color:'var(--warn)' }}>{KPI.pendingCollections.toLocaleString('es-ES',{minimumFractionDigits:2})} €</div>
          <div className="t-small" style={{ marginTop: 12 }}>2 clientes con saldo &gt; 30 días</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width:'100%' }} onClick={()=>setRoute('collect')}>Gestionar cobros</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0 }}>
          <div className="hstack" style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
            <div className="t-h2">Últimos pedidos</div>
            <div className="spacer"/>
            <button className="btn btn-ghost btn-sm" onClick={()=>setRoute('orders')}>Ver todos <Icon name="chev-right" size={14}/></button>
          </div>
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th className="num">Total</th><th>Estado</th></tr></thead>
            <tbody>
              {recentOrders.slice(0,5).map(o => {
                const cl = clients.find(c => c.id === o.client);
                return (
                  <tr key={o.id}>
                    <td className="bold">{o.id}</td>
                    <td>{cl?.name}</td>
                    <td className="muted">{o.date}</td>
                    <td className="num bold">{o.total.toFixed(2)} €</td>
                    <td>
                      <span className={`tag ${o.status==='exportado'?'tag-success':o.status==='pendiente'?'tag-warn':'tag-neutral'}`}>{o.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div className="hstack" style={{ marginBottom: 14 }}>
            <div className="t-h2">Promos activas</div>
            <div className="spacer"/>
            <button className="btn btn-ghost btn-sm" onClick={()=>setRoute('promos')}>Ver todas</button>
          </div>
          <div className="vstack" style={{ gap: 10 }}>
            {promos.map(pr => {
              const p = products.find(x => x.id === pr.sku);
              return (
                <div key={pr.id} className="hstack" style={{ padding: 10, border:'1px solid var(--border)', borderRadius: 'var(--r-2)', gap: 12 }}>
                  <div className="prod-img" style={{ width: 42, height: 42, background: p?.color || 'var(--surface-2)' }}>
                    {p && <ProdGlyph kind={p.glyph} size={28} color="rgba(20,24,26,0.55)"/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-tiny" style={{ marginBottom: 1 }}>HASTA {pr.end}</div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pr.title}</div>
                  </div>
                  <span className="tag tag-success">{pr.kind}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
