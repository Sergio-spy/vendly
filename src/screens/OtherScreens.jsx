import { useState } from 'react';
import { Icon, ProdGlyph } from '../components/Icon';
import { ProductImage } from '../components/ProductCard';

const KPI = {
  monthRevenue: 32420.50,
  monthGoal: 45000,
  monthOrders: 38,
  monthClients: 24,
  pendingOrders: 5,
  pendingCollections: 4150.20,
};

export function OrdersScreen({ orders = [], clients = [], onNew, onRefresh, onView }) {
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const filt = orders.filter(o => filter==='all' || o.status===filter);
  const counts = {
    all: orders.length,
    borrador: orders.filter(o=>o.status==='borrador').length,
    pendiente: orders.filter(o=>o.status==='pendiente').length,
    exportado: orders.filter(o=>o.status==='exportado').length,
  };
  const refresh = async () => {
    if (!onRefresh) return;
    setBusy(true);
    try { await onRefresh(); } finally { setBusy(false); }
  };
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack" style={{ gap: 16 }}>
        <div className="t-display">Pedidos</div>
        <div className="spacer"/>
        <button className="btn btn-secondary" onClick={refresh} disabled={busy}>
          <Icon name="sync" size={14}/> {busy ? 'Sincronizando…' : 'Sincronizar a Odoo'}
        </button>
        <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={14}/> Nuevo pedido</button>
      </div>
      <div className="hstack" style={{ gap: 8 }}>
        {[['all','Todos'],['borrador','Borrador'],['pendiente','Pendientes'],['exportado','Exportados']].map(([k,l])=>(
          <button key={k} className="chip chip-brand" data-active={String(filter===k)} onClick={()=>setFilter(k)}>
            {l} <span className="tabular muted-2" style={{ marginLeft: 4 }}>{counts[k]}</span>
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Líneas</th><th className="num">Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {filt.map(o => {
              const cl = clients.find(c => c.id === o.client);
              return (
                <tr key={o.id} style={{ cursor: onView ? 'pointer' : 'default' }} onClick={()=>onView?.(o)}>
                  <td className="bold">{o.id}</td>
                  <td>{cl?.name}<div className="t-small">#{cl?.code} · {cl?.city}</div></td>
                  <td className="muted tabular">{o.date}</td>
                  <td className="tabular">{o.lines}</td>
                  <td className="num bold tabular">{o.total.toFixed(2)} €</td>
                  <td><span className={`tag ${o.status==='exportado'?'tag-success':o.status==='pendiente'?'tag-warn':'tag-neutral'}`}>{o.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" onClick={(e)=>{ e.stopPropagation(); onView?.(o); }}><Icon name="eye" size={14}/></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientsScreen({ clients = [], onPick }) {
  const [q, setQ] = useState('');
  const filt = clients.filter(c => (c.name+c.code+c.city).toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack">
        <div className="t-display">Clientes</div>
        <div className="spacer"/>
        <button className="btn btn-primary"><Icon name="plus" size={14}/> Alta de cliente</button>
      </div>
      <div className="hstack" style={{ gap: 10 }}>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 420 }}>
          <Icon name="search" size={16} className="lead" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
          <input className="input input-search" placeholder="Buscar por nombre, código o ciudad…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filt.map(c => (
          <div key={c.id} className="card" style={{ padding: 18, cursor:'pointer' }} onClick={()=>onPick(c)}>
            <div className="hstack" style={{ marginBottom: 12 }}>
              <div className="avatar lg">{c.code.slice(-2)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                <div className="t-small">#{c.code} · {c.city}</div>
              </div>
              <span className="tag tag-info" style={{ background:'var(--surface-3)', color:'var(--ink-2)' }}>{c.tariff}</span>
            </div>
            <div className="hstack" style={{ gap: 16, fontSize: 12.5 }}>
              <div><div className="t-tiny">VENTA YTD</div><div className="tabular bold">{c.totalYtd.toFixed(2)} €</div></div>
              <div><div className="t-tiny">SALDO</div><div className="tabular" style={{ color: c.balance>0?'var(--warn)':'var(--ink-2)', fontWeight: 600 }}>{c.balance.toFixed(2)} €</div></div>
              <div><div className="t-tiny">ÚLT. PEDIDO</div><div className="tabular muted">{c.lastOrder}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TariffsScreen({ tariffs = [], products = [] }) {
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack"><div className="t-display">Tarifas</div><div className="spacer"/><button className="btn btn-primary"><Icon name="plus" size={14}/> Nueva tarifa</button></div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {tariffs.map(t => (
          <div key={t.id} className="card" style={{ padding: 22, borderTop: `3px solid ${t.color}` }}>
            <div className="hstack"><div className="t-h2">{t.name}</div><div className="spacer"/><span className="tag tag-neutral">{t.id}</span></div>
            <div className="t-small" style={{ marginTop: 6, marginBottom: 14 }}>{t.desc}</div>
            <div className="hstack" style={{ gap: 16 }}>
              <div><div className="t-tiny">CLIENTES</div><div className="tabular bold" style={{ fontSize: 22 }}>{t.clients}</div></div>
              <div className="spacer"/>
              <button className="btn btn-secondary btn-sm">Asignar a clientes</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}><div className="t-h2">Comparador de precios</div></div>
        <table className="tbl">
          <thead><tr><th>Artículo</th><th className="num">PVP</th><th className="num">T1 −8%</th><th className="num">T2 base</th><th className="num">T3 +6%</th></tr></thead>
          <tbody>
            {products.slice(0,8).map(p => (
              <tr key={p.id}>
                <td><div className="bold">{p.name}</div><div className="t-small">{p.sku}</div></td>
                <td className="num tabular muted">{p.pvp.toFixed(2)} €</td>
                <td className="num tabular bold" style={{ color:'var(--brand-700)' }}>{(p.pvp*0.92).toFixed(2)} €</td>
                <td className="num tabular bold">{p.pvp.toFixed(2)} €</td>
                <td className="num tabular bold" style={{ color:'var(--warn)' }}>{(p.pvp*1.06).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PromosScreen({ promos = [], products = [] }) {
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="t-display">Promociones activas</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {promos.map(pr => {
          const p = products.find(x => x.id === pr.sku);
          return (
            <div key={pr.id} className="card" style={{ padding: 0, overflow:'hidden' }}>
              <div className="prod-img" style={{ height: 140, background: p?.color || 'var(--surface-2)', borderRadius: 0 }}>
                {p && <ProductImage p={p}/>}
                <div style={{ position:'absolute', top: 12, left: 12, background:'var(--ink)', color:'white', padding:'5px 11px', borderRadius:'999px', fontWeight: 700, fontSize: 12 }}>{pr.kind}</div>
              </div>
              <div style={{ padding: 16 }}>
                <div className="t-tiny">VÁLIDA HASTA {pr.end}</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 4, marginBottom: 8, textWrap:'pretty' }}>{pr.title}</div>
                <div className="hstack"><div className="t-small muted">{p?.brand} · {p?.sku}</div><div className="spacer"/><span className="tag tag-success">stock {pr.stock}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StockScreen({ products = [] }) {
  const [q, setQ] = useState('');
  const filt = products.filter(p => (p.name+p.sku).toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack"><div className="t-display">Stock de almacén</div><div className="spacer"/><span className="tag tag-success"><Icon name="cloud" size={11}/> en tiempo real</span></div>
      <div className="input-wrap" style={{ maxWidth: 420 }}>
        <Icon name="search" size={16} className="lead" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
        <input className="input input-search" placeholder="Buscar artículo o SKU…" value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Artículo</th><th className="num">Almacén central</th><th className="num">Sucursal Norte</th><th className="num">Sucursal Sur</th><th className="num">Total</th><th>Estado</th></tr></thead>
          <tbody>
            {filt.map(p => {
              const a=Math.round(p.stock*0.6), b=Math.round(p.stock*0.25), c=p.stock-a-b;
              const s = p.stock===0?'sin stock':p.stock<20?'bajo':'ok';
              return (
                <tr key={p.id}>
                  <td><div className="bold">{p.name}</div><div className="t-small">{p.sku} · {p.brand}</div></td>
                  <td className="num tabular">{a}</td>
                  <td className="num tabular">{b}</td>
                  <td className="num tabular">{c}</td>
                  <td className="num tabular bold">{p.stock}</td>
                  <td><span className={`tag ${s==='ok'?'tag-success':s==='bajo'?'tag-warn':'tag-danger'}`}>{s}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CollectScreen({ clients = [] }) {
  const pend = clients.filter(c => c.balance > 0);
  const total = pend.reduce((a,c)=>a+c.balance,0);
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="t-display">Cobros pendientes</div>
      <div className="hstack" style={{ gap: 14 }}>
        <div className="card" style={{ padding: 18, flex: 1 }}>
          <div className="t-h3 muted">Total pendiente</div>
          <div className="tabular" style={{ fontSize: 30, fontWeight: 700, color:'var(--warn)' }}>{total.toFixed(2)} €</div>
        </div>
        <div className="card" style={{ padding: 18, flex: 1 }}>
          <div className="t-h3 muted">Clientes con saldo</div>
          <div className="tabular" style={{ fontSize: 30, fontWeight: 700 }}>{pend.length}</div>
        </div>
        <div className="card" style={{ padding: 18, flex: 1 }}>
          <div className="t-h3 muted">Vencido &gt; 30d</div>
          <div className="tabular" style={{ fontSize: 30, fontWeight: 700, color:'var(--danger)' }}>{pend.filter(c=>c.status==='pendiente').reduce((a,c)=>a+c.balance,0).toFixed(2)} €</div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Cliente</th><th>Forma de pago</th><th>Últ. pedido</th><th className="num">Saldo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {pend.map(c => (
              <tr key={c.id}>
                <td><div className="bold">{c.name}</div><div className="t-small">#{c.code} · {c.contact}</div></td>
                <td className="muted">{c.paymentTerm}</td>
                <td className="tabular muted">{c.lastOrder}</td>
                <td className="num tabular bold">{c.balance.toFixed(2)} €</td>
                <td><span className={`tag ${c.status==='pendiente'?'tag-danger':'tag-warn'}`}>{c.status==='pendiente'?'vencido':'al día'}</span></td>
                <td><button className="btn btn-secondary btn-sm"><Icon name="phone" size={13}/> Llamar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KpiScreen({ clients = [], products = [] }) {
  const goalPct = Math.round(KPI.monthRevenue / KPI.monthGoal * 100);
  const days = [4.2, 5.1, 3.8, 6.2, 4.9, 7.1, 5.3, 6.8, 4.1, 5.9, 7.4, 6.0, 8.2, 5.5, 6.9, 7.8];
  const max = Math.max(...days);
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="t-display">Mi rendimiento</div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="hstack" style={{ marginBottom: 14 }}>
            <div className="t-h2">Venta diaria · Abril</div>
            <div className="spacer"/>
            <span className="tag tag-success">+12%</span>
          </div>
          <svg viewBox="0 0 320 100" style={{ width:'100%', height: 180 }}>
            {days.map((d,i)=>(
              <rect key={i} x={i*20+4} y={100-(d/max)*90} width={14} height={(d/max)*90}
                fill={i===days.length-1?'var(--brand-500)':'var(--brand-200)'} rx="2"/>
            ))}
          </svg>
          <div className="hstack" style={{ marginTop: 14 }}>
            <div><div className="t-tiny">PROMEDIO DÍA</div><div className="tabular bold" style={{ fontSize: 20 }}>{(KPI.monthRevenue/16).toFixed(0)} €</div></div>
            <div className="divider-v" style={{ height: 32, margin:'0 20px' }}/>
            <div><div className="t-tiny">MEJOR DÍA</div><div className="tabular bold" style={{ fontSize: 20 }}>{(max*1000).toFixed(0)} €</div></div>
            <div className="divider-v" style={{ height: 32, margin:'0 20px' }}/>
            <div><div className="t-tiny">OBJETIVO</div><div className="tabular bold" style={{ fontSize: 20, color:'var(--brand-600)' }}>{goalPct}%</div></div>
          </div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="t-h2" style={{ marginBottom: 14 }}>Top clientes</div>
          <div className="vstack" style={{ gap: 10 }}>
            {[...clients].sort((a,b)=>b.totalYtd-a.totalYtd).slice(0,5).map((c,i)=>(
              <div key={c.id} className="hstack">
                <div className="avatar sm" style={{ background:'var(--surface-3)', color:'var(--ink-3)' }}>{i+1}</div>
                <div style={{ flex:1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
                  <div className="t-small">{c.city}</div>
                </div>
                <div className="tabular bold">{(c.totalYtd/1000).toFixed(1)}k €</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <div className="t-h2" style={{ marginBottom: 14 }}>Top artículos vendidos</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12 }}>
          {products.slice(0,4).map(p => (
            <div key={p.id} className="hstack" style={{ padding: 10, border:'1px solid var(--border)', borderRadius:'var(--r-2)' }}>
              <div className="prod-img" style={{ width: 40, height: 40, background: p.color }}><ProductImage p={p} size={26}/></div>
              <div style={{ flex:1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                <div className="t-small tabular">{Math.round(p.pvp*8)} ud · {(p.pvp*8).toFixed(0)} €</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminScreen({ mode = 'mock' }) {
  const sales = [
    { name:'Ana Ribera', email:'aribera@vendly.com', zone:'Levante', clients:42, status:'activo' },
    { name:'Pep Boronat', email:'pboronat@vendly.com', zone:'Costa Norte', clients:31, status:'activo' },
    { name:'Lluís Tena', email:'ltena@vendly.com', zone:'Interior', clients:28, status:'activo' },
    { name:'Marta Albert', email:'malbert@vendly.com', zone:'Costa Sur', clients:19, status:'inactivo' },
  ];
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack">
        <div className="t-display">Administración</div>
        <div className="spacer"/>
        <span className={`tag ${mode==='odoo'?'tag-success':'tag-warn'}`}><Icon name="cloud" size={11}/> {mode==='odoo'?'Conectado a Odoo':'Modo mock — sin Odoo'}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }} className="hstack">
            <div className="t-h2">Comerciales</div><div className="spacer"/>
            <button className="btn btn-primary btn-sm"><Icon name="plus" size={14}/> Alta</button>
          </div>
          <table className="tbl">
            <thead><tr><th>Nombre</th><th>Zona</th><th className="num">Clientes</th><th>Estado</th></tr></thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.email}>
                  <td><div className="bold">{s.name}</div><div className="t-small">{s.email}</div></td>
                  <td className="muted">{s.zone}</td>
                  <td className="num tabular">{s.clients}</td>
                  <td><span className={`tag ${s.status==='activo'?'tag-success':'tag-neutral'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="t-h2" style={{ marginBottom: 12 }}>Sincronización Odoo</div>
          <div className="vstack" style={{ gap: 10 }}>
            {[
              ['Productos & precios', '124 art.', 'hace 8 min'],
              ['Clientes', '187 cuentas', 'hace 22 min'],
              ['Tarifas', '3 listas', 'hace 1h'],
              ['Stock almacenes', '3 ubicaciones', 'tiempo real'],
              ['Pedidos exportados', '38 este mes', 'hace 2 min'],
            ].map(([k,v,t])=>(
              <div key={k} className="hstack" style={{ padding: 10, border:'1px solid var(--border)', borderRadius:'var(--r-2)' }}>
                <span className={`dot ${mode==='odoo'?'dot-success':'dot-neutral'}`}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{k}</div>
                  <div className="t-small">{v}</div>
                </div>
                <div className="t-small muted-2">{t}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ width:'100%', marginTop: 14 }}><Icon name="sync" size={14}/> Forzar sincronización completa</button>
        </div>
      </div>
    </div>
  );
}
