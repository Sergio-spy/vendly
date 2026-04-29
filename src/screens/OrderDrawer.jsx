import { useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductCard';

export function OrderDrawer({ open, onClose, cart, setCart, client, onConfirm, products = [], tariffMult = {} }) {
  const [discount, setDiscount] = useState(0);
  if (!open) return null;
  const tariff = client?.tariff || 'T2';
  const lines = Object.entries(cart).filter(([,n]) => n > 0).map(([id,n]) => {
    const p = products.find(x => x.id === id);
    if (!p) return null;
    const price = p.pvp * (tariffMult[tariff] || 1);
    return { p, qty: n, price, total: price * n };
  }).filter(Boolean);
  const subtotal = lines.reduce((a,l)=>a+l.total, 0);
  const desc = subtotal * (discount/100);
  const base = subtotal - desc;
  const iva = base * 0.21;
  const total = base + iva;

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-hd">
          <div>
            <div className="t-tiny">Pedido en curso</div>
            <div className="t-h1">{client ? client.name : 'Sin cliente'}</div>
            <div className="t-small">#{client?.code} · Tarifa {tariff} · {client?.paymentTerm}</div>
          </div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>

        <div className="drawer-body">
          {lines.length === 0 ? (
            <div className="empty">
              <div className="empty-ic"><Icon name="cart" size={24}/></div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>El pedido está vacío</div>
              <div className="t-small">Añade artículos desde el catálogo.</div>
            </div>
          ) : (
            <div className="vstack" style={{ gap: 8 }}>
              {lines.map(l => (
                <div key={l.p.id} className="hstack" style={{ padding: 10, border:'1px solid var(--border)', borderRadius:'var(--r-2)', gap: 10 }}>
                  <div className="prod-img" style={{ width: 44, height: 44, background: l.p.color, flexShrink: 0 }}>
                    <ProductImage p={l.p} size={28}/>
                  </div>
                  <div style={{ flex:1, minWidth: 0 }}>
                    <div className="t-tiny">{l.p.brand} · {l.p.sku}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.p.name}</div>
                    <div className="t-small tabular">{l.price.toFixed(2)} € / ud</div>
                  </div>
                  <div className="stepper">
                    <button onClick={()=>setCart({...cart, [l.p.id]: Math.max(0, l.qty-1)})}><Icon name="minus" size={14}/></button>
                    <input value={l.qty} onChange={e=>setCart({...cart, [l.p.id]: Math.max(0, parseInt(e.target.value)||0)})}/>
                    <button onClick={()=>setCart({...cart, [l.p.id]: l.qty+1})}><Icon name="plus" size={14}/></button>
                  </div>
                  <div className="tabular bold" style={{ width: 70, textAlign:'right' }}>{l.total.toFixed(2)} €</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="drawer-foot">
          <div className="vstack" style={{ gap: 8, marginBottom: 14 }}>
            <div className="hstack"><span className="muted">Subtotal</span><span className="spacer"/><span className="tabular">{subtotal.toFixed(2)} €</span></div>
            <div className="hstack" style={{ alignItems:'center' }}>
              <span className="muted">Descuento</span>
              <div className="spacer"/>
              <div className="hstack" style={{ gap: 6 }}>
                <input type="number" className="input" style={{ width: 64, height: 28, padding:'0 8px' }} value={discount} onChange={e=>setDiscount(parseFloat(e.target.value)||0)}/>
                <span className="muted">%</span>
                <span className="tabular muted-2" style={{ minWidth: 60, textAlign:'right' }}>−{desc.toFixed(2)} €</span>
              </div>
            </div>
            <div className="hstack"><span className="muted">Base imponible</span><span className="spacer"/><span className="tabular">{base.toFixed(2)} €</span></div>
            <div className="hstack"><span className="muted">IVA 21%</span><span className="spacer"/><span className="tabular">{iva.toFixed(2)} €</span></div>
            <div className="divider" style={{ margin:'4px 0' }}/>
            <div className="hstack"><span style={{ fontWeight: 700 }}>Total</span><span className="spacer"/><span className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{total.toFixed(2)} €</span></div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex:1 }}>Guardar borrador</button>
            <button className="btn btn-primary btn-lg" style={{ flex:2 }} onClick={onConfirm} disabled={lines.length===0}>
              <Icon name="check" size={16}/> Confirmar pedido
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
