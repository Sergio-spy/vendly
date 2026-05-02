import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { eur } from '../lib/format';
import { api } from '../api';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const COLORS = ['#2a9d63', '#2473c5', '#c97a17', '#d64545', '#82d0a3', '#1d7f50'];

function ComercialChart({ co, color }) {
  const [hover, setHover] = useState(null); // { idx, x, y, value }
  const [hostRect, setHostRect] = useState(null);
  const monthly = co.monthlyYear || Array(12).fill(0);
  const goal = co.goal?.monthly || 0;
  const max = Math.max(goal * 1.3, ...monthly, 1);
  const goalY = (1 - goal / max) * 100;
  const ytd = co.ytd || 0;
  const yearlyPct = co.goal?.yearly ? Math.round((ytd / co.goal.yearly) * 100) : null;
  const nowMonth = new Date().getMonth();

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="hstack" style={{ marginBottom: 12, gap: 10 }}>
        <div className="avatar" style={{ background: color + '22', color: color }}>{(co.name || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
        <div className="bold">{co.name}</div>
        <div className="spacer"/>
        {yearlyPct != null && (
          <div className="tag" style={{ background: color + '15', color, fontWeight: 700 }}>{yearlyPct}% año</div>
        )}
      </div>
      <div style={{ position: 'relative', height: 180 }} ref={el => el && setHostRect(el.getBoundingClientRect())}>
        <svg viewBox="0 0 320 110" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}
             onMouseLeave={() => setHover(null)}>
          {monthly.map((v, i) => {
            const h  = max ? (v / max) * 100 : 0;
            const w  = 320 / 12;
            const x  = i * w + 4;
            const yy = 110 - h;
            const isOver = goal > 0 && v >= goal;
            const isCurr = i === nowMonth;
            const fill  = v === 0 ? 'var(--surface-2)' : (isOver ? color : color + '88');
            const stroke = isCurr ? color : 'transparent';
            return (
              <rect key={i} x={x} y={yy} width={w-8} height={h || 0.001} fill={fill} stroke={stroke} strokeWidth="2" rx="2"
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                      const cx = r.left + (x + (w-8)/2) * (r.width/320);
                      const cy = r.top  + yy * (r.height/110);
                      setHover({ idx: i, x: cx, y: cy, value: v });
                    }}/>
            );
          })}
          {goal > 0 && (
            <>
              <line x1="0" x2="320" y1={goalY} y2={goalY} stroke={color} strokeWidth="1.4" strokeDasharray="3 3"/>
              <text x="316" y={goalY - 3} textAnchor="end" fontSize="9" fill={color} fontWeight="700">obj {Math.round(goal/1000)}k €/mes</text>
            </>
          )}
        </svg>
        {hover && hostRect && (
          <div style={{
            position: 'fixed',
            left: hover.x, top: hover.y - 12,
            transform: 'translate(-50%, -100%)',
            background: 'var(--ink)', color: 'white',
            padding: '6px 10px', borderRadius: 6,
            fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            zIndex: 100,
          }}>
            {MESES[hover.idx]} · {eur(hover.value)}
            <div style={{ position: 'absolute', left: '50%', bottom: -4, transform: 'translateX(-50%)', width: 8, height: 8, background: 'var(--ink)', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}/>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 0, fontSize: 9.5, color: 'var(--ink-4)', textAlign: 'center', marginTop: 4 }}>
        {MESES.map((m, i) => (
          <div key={m} style={{ fontWeight: i === nowMonth ? 700 : 400, color: i === nowMonth ? 'var(--ink-2)' : '' }}>{m}</div>
        ))}
      </div>
      <div className="hstack" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <div>
          <div className="t-tiny">YTD</div>
          <div className="tabular bold" style={{ fontSize: 18 }}>{eur(ytd)}</div>
        </div>
        <div className="spacer"/>
        <div style={{ textAlign: 'right' }}>
          <div className="t-tiny">Objetivo año</div>
          <div className="tabular muted bold" style={{ fontSize: 18 }}>{co.goal?.yearly ? eur(co.goal.yearly) : '—'}</div>
        </div>
      </div>
    </div>
  );
}

// Pantalla admin: análisis de los KPIs por comercial.
// Compara venta del mes, % vs objetivo, pedidos, clientes activos y saldo
// pendiente de cada uno. Útil para evaluar rentabilidad y consecución de
// objetivos de cada comercial.
export function AdminKpi() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const load = (m = month) => {
    setLoading(true); setErr(null);
    api.adminKpi(m)
      .then(d => setData(d.comerciales || []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(month); }, [month]);

  // Lista de últimos 12 meses para el selector.
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  const totalRev    = data.reduce((a,c)=>a+c.monthRevenue, 0);
  const totalOrders = data.reduce((a,c)=>a+c.monthOrders, 0);
  const totalGoal   = data.reduce((a,c)=>a+c.goal.monthly, 0);
  const totalBal    = data.reduce((a,c)=>a+c.balance, 0);

  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack" style={{ gap: 10 }}>
        <div className="t-display">Análisis comerciales</div>
        <div className="spacer"/>
        <select className="input" style={{ width: 200 }} value={month} onChange={e=>setMonth(e.target.value)}>
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={()=>load(month)} disabled={loading}>
          <Icon name="sync" size={14}/> {loading ? 'Cargando…' : 'Recargar'}
        </button>
      </div>

      {err && <div className="t-small" style={{ color:'var(--danger)' }}>Error: {err}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="t-h3 muted">Venta del mes</div>
          <div className="tabular bold" style={{ fontSize: 26 }}>{eur(totalRev)}</div>
          <div className="t-small muted">de {eur(totalGoal)} objetivo total</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="t-h3 muted">Pedidos del mes</div>
          <div className="tabular bold" style={{ fontSize: 26 }}>{totalOrders}</div>
          <div className="t-small muted">{data.length} comerciales activos</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="t-h3 muted">% objetivo</div>
          <div className="tabular bold" style={{ fontSize: 26, color: totalGoal && totalRev/totalGoal >= 1 ? 'var(--brand-700)' : 'var(--ink-2)' }}>
            {totalGoal ? Math.round((totalRev/totalGoal)*100) : 0}%
          </div>
          <div className="t-small muted">global</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="t-h3 muted">Saldo pendiente</div>
          <div className="tabular bold" style={{ fontSize: 26, color:'var(--warn)' }}>{eur(totalBal)}</div>
        </div>
      </div>

      {data.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
          {data.map((co, i) => (
            <ComercialChart key={co.id} co={co} color={COLORS[i % COLORS.length]}/>
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
          <div className="t-h2">Por comercial</div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Comercial</th>
              <th className="num">Venta mes</th>
              <th className="num">Objetivo</th>
              <th>% obj.</th>
              <th className="num">Pedidos</th>
              <th className="num">Clientes</th>
              <th className="num">Activos mes</th>
              <th className="num">Saldo pendiente</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => {
              const pct = c.goal.monthly ? Math.round((c.monthRevenue / c.goal.monthly) * 100) : null;
              const pctColor = pct == null ? 'var(--ink-4)'
                : pct >= 100 ? 'var(--brand-700)'
                : pct >= 70  ? 'var(--brand-500)'
                : pct >= 40  ? 'var(--warn)'
                : 'var(--danger)';
              return (
                <tr key={c.id}>
                  <td>
                    <div className="bold">{c.name}</div>
                    <div className="t-small">tag {c.odooTagId}</div>
                  </td>
                  <td className="num tabular bold">{eur(c.monthRevenue)}</td>
                  <td className="num tabular muted">{c.goal.monthly ? eur(c.goal.monthly) : '—'}</td>
                  <td>
                    {pct != null ? (
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                        <div style={{ width: 70, height: 6, background:'var(--surface-3)', borderRadius: 999, overflow:'hidden' }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height:'100%', background: pctColor, borderRadius: 999 }}/>
                        </div>
                        <span className="tabular bold" style={{ color: pctColor, minWidth: 42, textAlign:'right' }}>{pct}%</span>
                      </div>
                    ) : <span className="muted">sin obj.</span>}
                  </td>
                  <td className="num tabular">{c.monthOrders}</td>
                  <td className="num tabular muted">{c.clients}</td>
                  <td className="num tabular">{c.activeClients}</td>
                  <td className="num tabular" style={{ color: c.balance > 0 ? 'var(--warn)' : 'var(--ink-2)' }}>{eur(c.balance)}</td>
                </tr>
              );
            })}
            {data.length === 0 && !loading && (
              <tr><td colSpan={8} className="muted t-small" style={{ padding:'18px 22px', textAlign:'center' }}>
                Sin comerciales con etiqueta Odoo asignada.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
