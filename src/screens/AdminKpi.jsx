import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { eur } from '../lib/format';
import { api } from '../api';

// Pantalla admin: análisis de los KPIs por comercial.
// Compara venta del mes, % vs objetivo, pedidos, clientes activos y saldo
// pendiente de cada uno. Útil para evaluar rentabilidad y consecución de
// objetivos de cada comercial.
export function AdminKpi() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = () => {
    setLoading(true); setErr(null);
    api.adminKpi()
      .then(d => setData(d.comerciales || []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const totalRev    = data.reduce((a,c)=>a+c.monthRevenue, 0);
  const totalOrders = data.reduce((a,c)=>a+c.monthOrders, 0);
  const totalGoal   = data.reduce((a,c)=>a+c.goal.monthly, 0);
  const totalBal    = data.reduce((a,c)=>a+c.balance, 0);

  return (
    <div style={{ padding: 28, display:'flex', flexDirection:'column', gap: 20 }}>
      <div className="hstack">
        <div className="t-display">Análisis comerciales</div>
        <div className="spacer"/>
        <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
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
