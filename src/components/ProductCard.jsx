import { useState } from 'react';
import { Icon, ProdGlyph } from './Icon';
import { productImageUrl } from '../api';

// Imagen del producto con fallback al glyph cuando no hay imagen en Odoo.
function ProductImage({ p, size = '62%' }) {
  const [failed, setFailed] = useState(false);
  const url = !failed && p.odooId ? productImageUrl(p.odooId) : null;
  if (!url) {
    return <ProdGlyph kind={p.glyph} size={size} color="rgba(20,24,26,0.55)"/>;
  }
  return (
    <img
      src={url}
      alt={p.name}
      onError={() => setFailed(true)}
      style={{ width:'100%', height:'100%', objectFit:'contain', padding:'8%' }}
      loading="lazy"
    />
  );
}

export function ProductCard({ p, qty, setQty, tariff, tariffMult = {}, onOpen, showStock = false }) {
  const price = p.pvp * (tariffMult[tariff] || 1);
  const lowStock = p.stock > 0 && p.stock < 20;
  const noStock = p.stock === 0;
  const active = qty > 0;

  return (
    <article className="prod-card-hero" onClick={onOpen}>
      <div className="hero-img" style={{ background: p.color }}>
        <ProductImage p={p}/>
        {p.promo && <div className="badge-promo">{p.promo}</div>}
        {p.oferta && !p.promo && <span className="tag tag-success badge-tag">OFERTA</span>}
        {showStock && noStock && (
          <div className="badge-stock"><span className="tag tag-danger">Sin stock</span></div>
        )}
      </div>

      <div className="hero-body">
        <div className="hero-info">
          <div className="hero-meta">{p.brand}{p.brand && p.sku ? ' · ' : ''}{p.sku}</div>
          <div className="hero-name">{p.name}</div>
          <div className="hero-price">{price.toFixed(2)} €</div>
          {showStock && (
            <div className="hero-stock" style={{ color: lowStock ? 'var(--warn)' : noStock ? 'var(--danger)' : 'var(--ink-4)' }}>
              <span className={`dot ${lowStock?'dot-warn':noStock?'dot-danger':'dot-success'}`} style={{ display:'inline-block', marginRight:6, verticalAlign:'middle' }}/>
              {noStock ? 'sin stock' : `${p.stock} ud.`}
            </div>
          )}
        </div>
        <div className="hero-cta" onClick={e => e.stopPropagation()}>
          {active ? (
            <div className="stepper active lg">
              <button onClick={() => setQty(Math.max(0, qty - 1))}><Icon name="minus" size={14}/></button>
              <input value={qty} onChange={e => setQty(Math.max(0, parseInt(e.target.value)||0))}/>
              <button onClick={() => setQty(qty + 1)} disabled={showStock && noStock}><Icon name="plus" size={14}/></button>
            </div>
          ) : (
            <button className="qty-add" style={{ height: 40, width: 40 }} onClick={() => setQty(1)} disabled={showStock && noStock}>
              <Icon name="plus" size={18}/>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductRow({ p, qty, setQty, tariff, tariffMult = {}, onOpen, showStock = false }) {
  const price = p.pvp * (tariffMult[tariff] || 1);
  const noStock = p.stock === 0;
  const lowStock = p.stock > 0 && p.stock < 20;
  // Si no se muestra stock, escondemos esa columna entera del grid.
  const cols = showStock ? '48px 1fr 110px 90px 130px' : '48px 1fr 110px 130px';
  return (
    <div className="card" style={{ padding: 'var(--d-pad-row) 14px', display:'grid', gridTemplateColumns: cols, alignItems:'center', gap: 14, cursor:'pointer' }} onClick={onOpen}>
      <div className="prod-img" style={{ width: 48, height: 48, background: p.color }}>
        <ProductImage p={p} size={32}/>
      </div>
      <div>
        <div className="t-tiny">{p.brand} {p.brand && p.sku && '·'} {p.sku}</div>
        <div style={{ fontWeight: 600, fontSize: 'var(--d-fs-title)' }}>{p.name}</div>
      </div>
      <div className="tabular" style={{ fontWeight: 700 }}>{price.toFixed(2)} €</div>
      {showStock && (
        <div className="tabular" style={{ color: lowStock ? 'var(--warn)' : noStock ? 'var(--danger)' : 'var(--ink-3)', fontSize: 13 }}>
          <span className={`dot ${lowStock?'dot-warn':noStock?'dot-danger':'dot-success'}`} style={{ display:'inline-block', marginRight:6, verticalAlign:'middle' }}/>
          {noStock ? 'sin stock' : `${p.stock} ud.`}
        </div>
      )}
      <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'flex-end' }}>
        {qty > 0 ? (
          <div className="stepper active">
            <button onClick={() => setQty(Math.max(0, qty - 1))}><Icon name="minus" size={14}/></button>
            <input value={qty} onChange={e => setQty(Math.max(0, parseInt(e.target.value)||0))}/>
            <button onClick={() => setQty(qty + 1)}><Icon name="plus" size={14}/></button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setQty(1)}>
            <Icon name="plus" size={14}/> Añadir
          </button>
        )}
      </div>
    </div>
  );
}

// Exportada para usarla en ProductModal
export { ProductImage };
