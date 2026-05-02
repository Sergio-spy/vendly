import React, { useState } from 'react';
import { Icon, ProdGlyph } from '../components/Icon';
import { ProductImage } from '../components/ProductCard';
import { ClientForm } from './ClientForm';
import { TariffAssignModal } from './TariffAssignModal';
import { eur } from '../lib/format';
import { orderInvoiceUrl, api } from '../api';

const KPI = {
  monthRevenue: 32420.50,
  monthGoal: 45000,
  monthOrders: 38,
  monthClients: 24,
  pendingOrders: 5,
  pendingCollections: 4150.20,
};

export function OrdersScreen({ orders = [], clients = [], onNew, onRefresh, onView, onEdit }) {
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const filt = orders.filter(o => filter==='all' || o.status===filter);
  const counts = {
    all:       orders.length,
    borrador:  orders.filter(o=>o.status==='borrador').length,
    pendiente: orders.filter(o=>o.status==='pendiente').length,
    fabricado: orders.filter(o=>o.status==='fabricado').length,
    facturado: orders.filter(o=>o.status==='facturado').length,
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
        {[['all','Todos'],['borrador','Borrador'],['pendiente','Pendientes'],['fabricado','Fabricados'],['facturado','Facturados']].map(([k,l])=>(
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
              const canEdit = o.status === 'borrador';
              return (
                <tr key={o.id} style={{ cursor: onView ? 'pointer' : 'default' }} onClick={()=>onView?.(o)}>
                  <td className="bold">{o.id}</td>
                  <td>{cl?.name}<div className="t-small">#{cl?.code} · {cl?.city}</div></td>
                  <td className="muted tabular">{o.date}</td>
                  <td className="tabular">{o.lines}</td>
                  <td className="num bold tabular">{eur(o.total)}</td>
                  <td><span className={`tag ${o.status==='facturado'?'tag-success':o.status==='fabricado'?'tag-info':o.status==='pendiente'?'tag-warn':'tag-neutral'}`}>{o.status}</span></td>
                  <td onClick={e=>e.stopPropagation()} style={{ whiteSpace:'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" title="Ver" onClick={()=>onView?.(o)}><Icon name="eye" size={14}/></button>
                    {canEdit && (
                      <button className="btn btn-ghost btn-sm" title="Editar" onClick={()=>onEdit?.(o)} style={{ marginLeft: 4 }}>
                        <Icon name="edit" size={14}/>
                      </button>
                    )}
                    {(o.invoiceIds?.length > 0) && (
                      <a className="btn btn-ghost btn-sm" title="Descargar factura"
                         href={orderInvoiceUrl(o.odooId)}
                         target="_blank" rel="noopener noreferrer"
                         style={{ marginLeft: 4 }}>
                        <Icon name="doc" size={14}/>
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientsScreen({ clients = [], tariffs = [], onPick, onRefresh }) {
  const [q, setQ] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const filt = clients.filter(c => (c.name+c.code+c.city).toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack">
        <div className="t-display">Clientes</div>
        <div className="spacer"/>
        <button className="btn btn-primary" onClick={()=>{ setEditing(null); setFormOpen(true); }}>
          <Icon name="plus" size={14}/> Alta de cliente
        </button>
      </div>
      <div className="hstack" style={{ gap: 10 }}>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 420 }}>
          <Icon name="search" size={16} className="lead" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
          <input className="input input-search" placeholder="Buscar por nombre, código o ciudad…" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
      </div>
      <div className="vstack" style={{ gap: 8 }}>
        {filt.map(c => (
          <div key={c.id} className="card" style={{ padding: '14px 18px', cursor:'pointer', display:'grid', gridTemplateColumns:'48px minmax(0, 2fr) minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) auto auto', gap: 12, alignItems:'center' }} onClick={()=>onPick(c)}>
            <div className="avatar lg">{c.code.slice(-2)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</div>
              <div className="t-small">#{c.code} · {c.city}{c.contact ? ` · ${c.contact}` : ''}</div>
            </div>
            <span className="tag tag-info" style={{ background:'var(--surface-3)', color:'var(--ink-2)', justifySelf:'start', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', display:'inline-block' }} title={c.tariff}>{c.tariff}</span>
            <div>
              <div className="t-tiny">VENTA YTD</div>
              <div className="tabular bold">{eur(c.totalYtd)}</div>
            </div>
            <div>
              <div className="t-tiny">SALDO</div>
              <div className="tabular" style={{ color: c.balance>0?'var(--warn)':'var(--ink-2)', fontWeight: 600 }}>{eur(c.balance)}</div>
            </div>
            <div>
              <div className="t-tiny">ÚLT. PEDIDO</div>
              <div className="tabular muted">{c.lastOrder || '—'}</div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" title="Editar cliente" onClick={(e)=>{ e.stopPropagation(); setEditing(c); setFormOpen(true); }}>
              <Icon name="edit" size={14}/>
            </button>
            <Icon name="chev-right" size={16} style={{ color:'var(--ink-4)' }}/>
          </div>
        ))}
        {filt.length === 0 && (
          <div className="empty">
            <div className="empty-ic"><Icon name="search" size={24}/></div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin clientes</div>
            <div className="t-small">Prueba a quitar la búsqueda.</div>
          </div>
        )}
      </div>

      <ClientForm
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        client={editing}
        tariffs={tariffs}
        onClose={()=>{ setFormOpen(false); setEditing(null); }}
        onSaved={()=>{ onRefresh?.(); }}
      />
    </div>
  );
}

export function TariffsScreen({ tariffs = [], products = [], clients = [], onClientsRefresh }) {
  const [assignTariff, setAssignTariff] = useState(null);
  // Recalcular cuántos clientes tiene cada tarifa a partir de la lista real.
  // Matching por odooId (más fiable que por nombre, que difiere en "(EUR)").
  const counts = clients.reduce((acc, c) => {
    if (c.tariffOdooId) acc[c.tariffOdooId] = (acc[c.tariffOdooId] || 0) + 1;
    return acc;
  }, {});
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack"><div className="t-display">Tarifas</div><div className="spacer"/><button className="btn btn-primary"><Icon name="plus" size={14}/> Nueva tarifa</button></div>
      <div className="vstack" style={{ gap: 8 }}>
        {tariffs.map(t => (
          <div key={t.id} className="card" style={{ padding:'14px 18px 14px 22px', borderLeft: `4px solid ${t.color}`, display:'grid', gridTemplateColumns:'minmax(0, 1fr) 120px auto', gap: 18, alignItems:'center' }}>
            <div style={{ minWidth: 0 }}>
              <div className="hstack" style={{ gap: 8 }}>
                <div className="t-h2" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
                <span className="tag tag-neutral">{t.id}</span>
              </div>
              {t.desc && <div className="t-small" style={{ marginTop: 2 }}>{t.desc}</div>}
            </div>
            <div>
              <div className="t-tiny">CLIENTES</div>
              <div className="tabular bold" style={{ fontSize: 20 }}>{counts[t.odooId] ?? t.clients}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={()=>setAssignTariff(t)} disabled={!t.odooId}>Asignar a clientes</button>
          </div>
        ))}
      </div>
      <TariffAssignModal
        open={!!assignTariff}
        tariff={assignTariff}
        clients={clients}
        onClose={()=>setAssignTariff(null)}
        onSaved={()=>{ onClientsRefresh?.(); }}
      />
      <PricelistComparator products={products} tariffs={tariffs}/>
    </div>
  );
}

function PricelistComparator({ products = [], tariffs = [] }) {
  const [picked, setPicked] = React.useState([]); // array de templateIds (number)
  const [q, setQ] = React.useState('');
  const [matrix, setMatrix] = React.useState({ products: [], prices: {} });
  const [loading, setLoading] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const reload = React.useCallback(async (templateIds) => {
    if (!templateIds.length || !tariffs.length) {
      setMatrix({ products: [], prices: {} });
      return;
    }
    setLoading(true);
    try {
      const data = await api.comparePricelists({
        templateIds,
        pricelistIds: tariffs.map(t => t.odooId).filter(Boolean),
      });
      setMatrix(data);
    } catch {
      setMatrix({ products: [], prices: {} });
    } finally { setLoading(false); }
  }, [tariffs]);

  React.useEffect(() => { reload(picked); }, [picked, reload]);

  const togglePick = (templateId) => {
    setPicked(prev => prev.includes(templateId) ? prev.filter(x=>x!==templateId) : [...prev, templateId]);
  };

  const filtProds = q
    ? products.filter(p => (p.name + (p.sku||'')).toLowerCase().includes(q.toLowerCase()))
    : products.slice(0, 30);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
        <div className="t-h2">Comparador de precios</div>
        <div className="spacer"/>
        <button className="btn btn-secondary btn-sm" onClick={()=>setPickerOpen(true)}>
          <Icon name="plus" size={14}/> Elegir artículos
        </button>
      </div>
      {picked.length === 0 ? (
        <div className="empty">
          <div className="empty-ic"><Icon name="catalog" size={24}/></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin artículos seleccionados</div>
          <div className="t-small">Pulsa "Elegir artículos" para añadir y comparar precios entre tarifas.</div>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Artículo</th>
              <th className="num">PVP</th>
              {tariffs.map(t => <th key={t.id} className="num">{t.name}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matrix.products.map(p => (
              <tr key={p.templateId}>
                <td><div className="bold">{p.name}</div><div className="t-small">{p.sku}</div></td>
                <td className="num tabular muted">{eur(p.pvp)}</td>
                {tariffs.map(t => {
                  const price = matrix.prices?.[p.templateId]?.[t.odooId];
                  return <td key={t.id} className="num tabular bold">{price != null ? eur(price) : '—'}</td>;
                })}
                <td>
                  <button className="btn btn-ghost btn-sm" title="Quitar" onClick={()=>togglePick(p.templateId)}>
                    <Icon name="x" size={14}/>
                  </button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr><td colSpan={tariffs.length + 3} className="muted t-small" style={{ textAlign:'center', padding:'12px 22px' }}>Cargando precios…</td></tr>
            )}
          </tbody>
        </table>
      )}

      {pickerOpen && (
        <>
          <div className="scrim" onClick={()=>setPickerOpen(false)}/>
          <div className="modal" style={{ width: 600, maxHeight:'80vh' }}>
            <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div className="t-h2">Artículos a comparar</div>
              <div className="spacer"/>
              <span className="t-small muted">{picked.length} seleccionado{picked.length === 1 ? '' : 's'}</span>
              <button className="btn btn-ghost btn-icon" onClick={()=>setPickerOpen(false)}><Icon name="x"/></button>
            </div>
            <div style={{ padding:'14px 22px 0' }}>
              <div className="input-wrap">
                <Icon name="search" size={16} className="lead" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
                <input className="input input-search" placeholder="Buscar por nombre o SKU…" value={q} onChange={e=>setQ(e.target.value)}/>
              </div>
            </div>
            <div style={{ padding:'10px 22px', overflowY:'auto', maxHeight: '50vh' }}>
              <div className="vstack" style={{ gap: 4 }}>
                {filtProds.map(p => {
                  const checked = picked.includes(p.templateId);
                  return (
                    <label key={p.id} className="hstack" style={{ padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'var(--r-2)', cursor:'pointer', gap: 12, background: checked ? 'var(--brand-50)' : 'var(--surface)' }}>
                      <input type="checkbox" checked={checked} onChange={()=>togglePick(p.templateId)} style={{ accentColor:'var(--brand-500)' }}/>
                      <div style={{ flex:1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                        <div className="t-small">{p.sku || '—'}</div>
                      </div>
                      <span className="tabular t-small muted">{eur(p.pvp)}</span>
                    </label>
                  );
                })}
                {filtProds.length === 0 && <div className="muted t-small" style={{ padding: 20, textAlign:'center' }}>Sin resultados</div>}
              </div>
            </div>
            <div className="hstack" style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', background:'var(--surface-2)' }}>
              <button className="btn btn-secondary" onClick={()=>setPicked([])} disabled={picked.length === 0}>Quitar todos</button>
              <div className="spacer"/>
              <button className="btn btn-primary" onClick={()=>setPickerOpen(false)}>
                <Icon name="check" size={14}/> Listo
              </button>
            </div>
          </div>
        </>
      )}
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
              <div className="prod-img" style={{ height: 140, borderRadius: 0 }}>
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
  const [contactOpen, setContactOpen] = useState(null); // cliente del popover
  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="t-display">Cobros pendientes</div>
      <div className="hstack" style={{ gap: 14 }}>
        <div className="card" style={{ padding: 18, flex: 1 }}>
          <div className="t-h3 muted">Total pendiente</div>
          <div className="tabular" style={{ fontSize: 30, fontWeight: 700, color:'var(--warn)' }}>{eur(total)}</div>
        </div>
        <div className="card" style={{ padding: 18, flex: 1 }}>
          <div className="t-h3 muted">Clientes con saldo</div>
          <div className="tabular" style={{ fontSize: 30, fontWeight: 700 }}>{pend.length}</div>
        </div>
        <div className="card" style={{ padding: 18, flex: 1 }}>
          <div className="t-h3 muted">Vencido &gt; 30d</div>
          <div className="tabular" style={{ fontSize: 30, fontWeight: 700, color:'var(--danger)' }}>{eur(pend.filter(c=>c.status==='pendiente').reduce((a,c)=>a+c.balance,0))}</div>
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
                <td className="num tabular bold">{eur(c.balance)}</td>
                <td><span className={`tag ${c.status==='pendiente'?'tag-danger':'tag-warn'}`}>{c.status==='pendiente'?'vencido':'al día'}</span></td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={()=>setContactOpen(c)} disabled={!c.phone && !c.email && !c.mobile}>
                    <Icon name="phone" size={13}/> Contactar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contactOpen && (
        <>
          <div className="scrim" onClick={()=>setContactOpen(null)}/>
          <div className="modal" style={{ width: 420 }}>
            <div className="hstack" style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)' }}>
              <div>
                <div className="t-tiny">CONTACTAR</div>
                <div className="t-h2">{contactOpen.name}</div>
              </div>
              <div className="spacer"/>
              <button className="btn btn-ghost btn-icon" onClick={()=>setContactOpen(null)}><Icon name="x"/></button>
            </div>
            <div style={{ padding: 22 }} className="vstack">
              {(contactOpen.phone || contactOpen.mobile) && (
                <a href={`tel:${(contactOpen.mobile || contactOpen.phone).replace(/\s/g,'')}`}
                   className="hstack" style={{ padding:'12px 14px', border:'1px solid var(--border)', borderRadius:'var(--r-2)', textDecoration:'none', color:'var(--ink)', gap: 12 }}>
                  <Icon name="phone" size={18}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-tiny">TELÉFONO</div>
                    <div className="tabular bold">{contactOpen.mobile || contactOpen.phone}</div>
                  </div>
                  <Icon name="chev-right" size={14} style={{ color:'var(--ink-4)' }}/>
                </a>
              )}
              {contactOpen.email && (
                <a href={`mailto:${contactOpen.email}`}
                   className="hstack" style={{ padding:'12px 14px', border:'1px solid var(--border)', borderRadius:'var(--r-2)', textDecoration:'none', color:'var(--ink)', gap: 12 }}>
                  <Icon name="bell" size={18}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-tiny">EMAIL</div>
                    <div className="bold" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{contactOpen.email}</div>
                  </div>
                  <Icon name="chev-right" size={14} style={{ color:'var(--ink-4)' }}/>
                </a>
              )}
              {!contactOpen.phone && !contactOpen.mobile && !contactOpen.email && (
                <div className="muted t-small">Sin datos de contacto.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function KpiScreen({ clients = [], products = [] }) {
  const [range, setRange] = useState('month');
  const [data, setData] = useState({ series: [], average: 0, max: 0, topProducts: [] });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.kpi(range).then(d => { if (!cancel) setData(d); })
      .catch(() => { if (!cancel) setData({ series: [], average: 0, max: 0, topProducts: [] }); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, [range]);

  const totals = data.series.map(s => s.total);
  const max = data.max || (totals.length ? Math.max(...totals) : 0);
  const sumPeriod = totals.reduce((a,b)=>a+b, 0);
  const bestKey = max > 0 ? data.series.find(s => s.total === max)?.label : '—';
  const labelTitle = range === 'day' ? 'Venta diaria (últimos 16 días)' : 'Venta mensual (últimos 16 meses)';
  const labelAvg   = range === 'day' ? 'PROMEDIO DÍA' : 'PROMEDIO MES';
  const labelBest  = range === 'day' ? 'MEJOR DÍA'    : 'MEJOR MES';

  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="t-display">Mi rendimiento</div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="hstack" style={{ marginBottom: 14, gap: 10 }}>
            <div className="t-h2">{labelTitle}</div>
            <div className="spacer"/>
            <div className="hstack" style={{ gap: 6 }}>
              {[['day','Diaria'],['month','Mensual']].map(([k,l]) => (
                <button key={k} className="chip chip-brand" data-active={String(range===k)} onClick={()=>setRange(k)}>{l}</button>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 320 100" style={{ width:'100%', height: 180 }} preserveAspectRatio="none">
            {data.series.map((s,i)=> {
              const h = max > 0 ? (s.total / max) * 90 : 0;
              return (
                <g key={s.key}>
                  <rect x={i*20+4} y={100-h} width={14} height={h}
                    fill={i === data.series.length-1 ? 'var(--brand-500)' : 'var(--brand-200)'} rx="2"/>
                </g>
              );
            })}
          </svg>
          <div className="hstack" style={{ marginTop: 4, gap: 6, fontSize: 10, color: 'var(--ink-4)' }}>
            {data.series.map(s => (
              <div key={s.key} style={{ flex: 1, textAlign:'center', minWidth: 0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</div>
            ))}
          </div>
          <div className="hstack" style={{ marginTop: 14, flexWrap:'wrap', gap: 10 }}>
            <div><div className="t-tiny">{labelAvg}</div><div className="tabular bold" style={{ fontSize: 20 }}>{eur(data.average)}</div></div>
            <div className="divider-v" style={{ height: 32, margin:'0 12px' }}/>
            <div><div className="t-tiny">{labelBest}</div><div className="tabular bold" style={{ fontSize: 20 }}>{eur(max)}</div><div className="t-small">{bestKey}</div></div>
            <div className="divider-v" style={{ height: 32, margin:'0 12px' }}/>
            <div><div className="t-tiny">TOTAL PERIODO</div><div className="tabular bold" style={{ fontSize: 20, color:'var(--brand-600)' }}>{eur(sumPeriod)}</div></div>
          </div>
          {loading && <div className="t-small muted" style={{ marginTop: 8 }}>Cargando…</div>}
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
      <div className="card" style={{ padding: 0 }}>
        <div className="hstack" style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
          <div className="t-h2">Top artículos vendidos</div>
          <div className="spacer"/>
          <span className="t-small muted">{range === 'day' ? 'últimos 30 días' : 'últimos 12 meses'}</span>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>Artículo</th><th className="num">Unidades</th><th className="num">Importe</th></tr>
          </thead>
          <tbody>
            {data.topProducts.map((p, i) => (
              <tr key={p.id}>
                <td className="muted tabular">{i+1}</td>
                <td className="bold">{p.name}</td>
                <td className="num tabular">{p.qty}</td>
                <td className="num tabular bold">{eur(p.total)}</td>
              </tr>
            ))}
            {data.topProducts.length === 0 && (
              <tr><td colSpan={4} className="muted t-small" style={{ padding:'18px 22px', textAlign:'center' }}>
                {loading ? 'Cargando…' : 'Sin pedidos en el periodo'}
              </td></tr>
            )}
          </tbody>
        </table>
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
