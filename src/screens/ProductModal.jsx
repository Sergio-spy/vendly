import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductCard';

const FAMILY_LABELS = { limp:'Limpiadores', desin:'Desinfectantes', celu:'Celulosa & papel', bolsa:'Bolsas & basura', utens:'Utensilios', dispe:'Dispensadores', epi:'EPI & guantes' };

export function ProductModal({ product, onClose, qty, setQty, tariff, tariffMult = {} }) {
  if (!product) return null;
  const p = product;
  const price = p.pvp * (tariffMult[tariff] || 1);
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 720, maxHeight: '90vh' }}>
        <div className="hstack" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
          <div className="t-tiny">{p.brand} · {p.sku}</div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap: 0 }}>
          <div className="prod-img" style={{ height: 320, background: p.color, borderRadius: 0 }}>
            <ProductImage p={p}/>
            {p.promo && <div style={{ position:'absolute', top: 14, left: 14, background:'var(--ink)', color:'white', padding:'5px 11px', borderRadius:'999px', fontWeight: 700, fontSize: 12 }}>{p.promo}</div>}
          </div>
          <div style={{ padding: 22 }}>
            <div className="t-h1" style={{ marginBottom: 8 }}>{p.name}</div>
            <div className="hstack" style={{ gap: 6, marginBottom: 18 }}>
              <span className="tag tag-neutral">{FAMILY_LABELS[p.family] || p.family}</span>
              {p.oferta && <span className="tag tag-success">OFERTA</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div><div className="t-tiny">PVP</div><div className="tabular muted" style={{ fontSize: 17, textDecoration: tariff!=='T2'?'line-through':'none' }}>{p.pvp.toFixed(2)} €</div></div>
              <div><div className="t-tiny">PRECIO TARIFA {tariff}</div><div className="tabular bold" style={{ fontSize: 24, color: 'var(--brand-700)' }}>{price.toFixed(2)} €</div></div>
              <div><div className="t-tiny">STOCK TOTAL</div><div className="tabular bold" style={{ fontSize: 17 }}>{p.stock} ud.</div></div>
              <div><div className="t-tiny">UNIDAD MÍN.</div><div className="tabular bold" style={{ fontSize: 17 }}>1 ud.</div></div>
            </div>
            <div className="t-small muted" style={{ marginBottom: 18, lineHeight: 1.55 }}>
              Producto profesional para limpieza e higiene. Apto para uso en hostelería, geriátricos y limpieza industrial. Cumple normativa europea.
            </div>
            <div className="hstack" style={{ gap: 10 }}>
              <div className="stepper lg">
                <button onClick={()=>setQty(Math.max(0,qty-1))}><Icon name="minus" size={16}/></button>
                <input value={qty} onChange={e=>setQty(Math.max(0,parseInt(e.target.value)||0))}/>
                <button onClick={()=>setQty(qty+1)} disabled={p.stock===0}><Icon name="plus" size={16}/></button>
              </div>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={()=>{ if(qty===0) setQty(1); onClose(); }}>
                <Icon name="cart" size={16}/> {qty===0?'Añadir al pedido':'Actualizar pedido'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
