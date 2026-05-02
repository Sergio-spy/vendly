import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { api } from '../api';
import { eur } from '../lib/format';

const STATUS_LABEL = { borrador:'Por confirmar', pendiente:'Pendiente', fabricado:'Fabricado', facturado:'Facturado', cancelado:'Cancelado' };

export function OrderDetailModal({ order, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!order) return;
    let cancel = false;
    setLoading(true);
    setError(null);
    api.order(order.odooId || order.id).then(d => {
      if (!cancel) setData(d);
    }).catch(e => {
      if (!cancel) setError(e.message);
    }).finally(() => {
      if (!cancel) setLoading(false);
    });
    return () => { cancel = true; };
  }, [order]);

  if (!order) return null;

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 820, maxHeight: '90vh' }}>
        <div className="hstack" style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div className="t-tiny">PEDIDO</div>
            <div className="t-h1">{data?.order?.id || order.id}</div>
          </div>
          <div className="spacer"/>
          <span className={`tag ${order.status==='facturado'?'tag-success':order.status==='fabricado'?'tag-info':order.status==='pendiente'?'tag-warn':'tag-neutral'}`}>
            {STATUS_LABEL[order.status] || order.status}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>

        <div className="drawer-body">
          {loading && <div className="muted">Cargando detalle…</div>}
          {error && <div style={{ color:'var(--danger)' }}>{error}</div>}
          {data?.order && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <div className="t-tiny">CLIENTE</div>
                  <div style={{ fontWeight: 600 }}>{data.order.partnerName}</div>
                </div>
                <div>
                  <div className="t-tiny">FECHA</div>
                  <div className="tabular">{data.order.date || '—'}</div>
                </div>
                <div>
                  <div className="t-tiny">TARIFA</div>
                  <div>{data.order.pricelistName || '—'}</div>
                </div>
                {data.order.ref && (
                  <div>
                    <div className="t-tiny">REFERENCIA CLIENTE</div>
                    <div>{data.order.ref}</div>
                  </div>
                )}
              </div>

              <div className="t-tiny" style={{ marginBottom: 8 }}>LÍNEAS ({data.lines.length})</div>
              <div className="card" style={{ padding: 0, marginBottom: 16 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="num">Cant.</th>
                      <th className="num">Precio</th>
                      <th className="num">Dto.</th>
                      <th className="num">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map(l => (
                      <tr key={l.odooId}>
                        <td>
                          <div className="bold">{l.productName}</div>
                          {l.description && l.description !== l.productName && (
                            <div className="t-small">{l.description}</div>
                          )}
                        </td>
                        <td className="num tabular">{l.qty}</td>
                        <td className="num tabular">{eur(l.price)}</td>
                        <td className="num tabular">{l.discount ? `${l.discount}%` : '—'}</td>
                        <td className="num tabular bold">{eur(l.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="vstack" style={{ gap: 6, alignItems:'flex-end' }}>
                <div className="hstack" style={{ minWidth: 260 }}>
                  <span className="muted">Base imponible</span>
                  <span className="spacer"/>
                  <span className="tabular">{eur(data.order.amountUntaxed)}</span>
                </div>
                <div className="hstack" style={{ minWidth: 260 }}>
                  <span className="muted">Impuestos</span>
                  <span className="spacer"/>
                  <span className="tabular">{eur(data.order.amountTax)}</span>
                </div>
                <div className="hstack" style={{ minWidth: 260, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span className="spacer"/>
                  <span className="tabular" style={{ fontSize: 18, fontWeight: 700 }}>{eur(data.order.total)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="drawer-foot hstack">
          <div className="muted t-small">ID Odoo: {data?.order?.odooId || order.odooId || '—'}</div>
          <div className="spacer"/>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </>
  );
}
