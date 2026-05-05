import { useState } from 'react';
import { Icon, ProdGlyph } from './Icon';
import { productImageUrl } from '../api';
import { eur } from '../lib/format';
import { VariantMosaic } from './VariantMosaic';

// Imagen del producto con fallback al glyph cuando no hay imagen en Odoo.
// Acepta tanto productos con odooId (variante) como con templateId (plantilla).
function ProductImage({ p, size = '62%' }) {
  const [failed, setFailed] = useState(false);
  let url = null;
  if (!failed) {
    const opts = p.imgV ? { v: p.imgV } : {};
    if (p.templateId) url = productImageUrl({ templateId: p.templateId }, opts);
    else if (p.odooId) url = productImageUrl(p.odooId, opts);
  }
  if (!url) {
    return <ProdGlyph kind={p.glyph} size={size} color="rgba(20,24,26,0.55)"/>;
  }
  return (
    <img
      src={url}
      alt={p.name}
      onError={() => setFailed(true)}
      style={{ maxWidth:'88%', maxHeight:'88%', objectFit:'contain' }}
      loading="lazy"
    />
  );
}

export function ProductCard({ p, qty, setQty, isMulti = false, tariff, tariffMult = {}, onOpen, showStock = false }) {
  const price = p.pvp * (tariffMult[tariff] || 1);
  const lowStock = p.stock > 0 && p.stock < 20;
  const noStock = p.stock === 0;
  const active = qty > 0;
  // Si el producto tiene packaging (caja de N), el stepper de la tarjeta opera
  // en CAJAS: cada +/- mueve N unidades del carrito y el input muestra cuántas
  // cajas hay. El total de unidades sigue viviendo en `qty`.
  const pkgQty = p.packaging?.qty || 1;
  const boxesView = pkgQty > 1 ? Math.floor(qty / pkgQty) : qty;
  const inputDisplay = boxesView;
  const onPlus  = () => setQty(qty + pkgQty);
  const onMinus = () => setQty(Math.max(0, qty - pkgQty));
  const onInput = (n) => setQty(Math.max(0, Number.isFinite(n) ? n : 0) * pkgQty);
  const initialAdd = () => setQty(pkgQty);

  return (
    <article className="prod-card-hero" onClick={onOpen}>
      <div className="hero-img">
        {isMulti && (p.variantIds?.length || 0) > 1
          ? <VariantMosaic variantIds={p.variantIds} fallbackGlyph={p.glyph} size="78%" version={p.imgV}/>
          : <ProductImage p={p}/>}
        {p.promo && <div className="badge-promo">{p.promo}</div>}
        {p.oferta && !p.promo && <span className="tag tag-success badge-tag">OFERTA</span>}
      </div>

      <div className="hero-body">
        <div className="hero-info">
          <div className="hero-meta">
            {p.sku && <>Ref: <span className="tabular">{p.sku}</span></>}
            {p.sku && p.ean ? ' · ' : ''}
            {p.ean && <>EAN: <span className="tabular">{p.ean}</span></>}
            {!p.sku && !p.ean && p.brand}
          </div>
          <div className="hero-name">{p.name}</div>
          <div className="hero-price">{eur(price)}</div>
          {p.packaging && (
            <div className="t-tiny" style={{ color:'var(--ink-3)', marginTop: 2 }}>
              📦 {p.packaging.name} · <span className="tabular">{eur(price * p.packaging.qty)}</span>
            </div>
          )}
          {showStock && (
            <div className="hero-stock" style={{ color: lowStock ? 'var(--warn)' : noStock ? 'var(--danger)' : 'var(--ink-4)' }}>
              <span className={`dot ${lowStock?'dot-warn':noStock?'dot-danger':'dot-success'}`} style={{ display:'inline-block', marginRight:6, verticalAlign:'middle' }}/>
              {noStock ? 'sin stock' : `${p.stock} ud.`}
            </div>
          )}
        </div>
        <div className="hero-cta" onClick={e => e.stopPropagation()}>
          {isMulti ? (
            <button className="btn btn-secondary btn-sm" onClick={onOpen} title="Elegir variante">
              <Icon name="chev-right" size={14}/> Variantes
            </button>
          ) : active ? (
            <div className="stepper active lg">
              <button onClick={onMinus}><Icon name="minus" size={14}/></button>
              <input value={inputDisplay} onChange={e => onInput(parseInt(e.target.value)||0)}/>
              <button onClick={onPlus} disabled={showStock && noStock}><Icon name="plus" size={14}/></button>
            </div>
          ) : (
            <button className="qty-add" style={{ height: 40, width: 40 }} onClick={initialAdd} disabled={showStock && noStock} title={pkgQty > 1 ? `Añadir ${p.packaging.name.toLowerCase()} (${pkgQty} ud)` : 'Añadir 1 ud'}>
              <Icon name="plus" size={18}/>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductRow({ p, qty, setQty, isMulti = false, tariff, tariffMult = {}, onOpen, showStock = false }) {
  const price = p.pvp * (tariffMult[tariff] || 1);
  const noStock = p.stock === 0;
  const lowStock = p.stock > 0 && p.stock < 20;
  // Si no se muestra stock, escondemos esa columna entera del grid.
  const cols = showStock ? '48px 1fr 110px 90px 130px' : '48px 1fr 110px 130px';
  // Stepper en cajas (mismo patrón que ProductCard).
  const pkgQty = p.packaging?.qty || 1;
  const inputDisplay = pkgQty > 1 ? Math.floor(qty / pkgQty) : qty;
  const onPlus  = () => setQty(qty + pkgQty);
  const onMinus = () => setQty(Math.max(0, qty - pkgQty));
  const onInput = (n) => setQty(Math.max(0, Number.isFinite(n) ? n : 0) * pkgQty);
  const initialAdd = () => setQty(pkgQty);
  return (
    <div className="card" style={{ padding: 'var(--d-pad-row) 14px', display:'grid', gridTemplateColumns: cols, alignItems:'center', gap: 14, cursor:'pointer' }} onClick={onOpen}>
      <div className="prod-img" style={{ width: 48, height: 48, overflow:'hidden', borderRadius: 6 }}>
        {isMulti && (p.variantIds?.length || 0) > 1
          ? <VariantMosaic variantIds={p.variantIds} fallbackGlyph={p.glyph} size="76%" version={p.imgV}/>
          : <ProductImage p={p} size={32}/>}
      </div>
      <div>
        <div className="t-tiny">
          {p.sku && <>Ref: <span className="tabular">{p.sku}</span></>}
          {p.sku && p.ean ? ' · ' : ''}
          {p.ean && <>EAN: <span className="tabular">{p.ean}</span></>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 'var(--d-fs-title)' }}>{p.name}</div>
        {p.packaging && (
          <div className="t-tiny" style={{ color:'var(--ink-3)' }}>
            📦 {p.packaging.name} · <span className="tabular">{eur(price * p.packaging.qty)}</span>
          </div>
        )}
      </div>
      <div className="tabular" style={{ fontWeight: 700 }}>{eur(price)}</div>
      {showStock && (
        <div className="tabular" style={{ color: lowStock ? 'var(--warn)' : noStock ? 'var(--danger)' : 'var(--ink-3)', fontSize: 13 }}>
          <span className={`dot ${lowStock?'dot-warn':noStock?'dot-danger':'dot-success'}`} style={{ display:'inline-block', marginRight:6, verticalAlign:'middle' }}/>
          {noStock ? 'sin stock' : `${p.stock} ud.`}
        </div>
      )}
      <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'flex-end' }}>
        {isMulti ? (
          <button className="btn btn-secondary btn-sm" onClick={onOpen}>
            <Icon name="chev-right" size={14}/> Variantes
          </button>
        ) : qty > 0 ? (
          <div className="stepper active">
            <button onClick={onMinus}><Icon name="minus" size={14}/></button>
            <input value={inputDisplay} onChange={e => onInput(parseInt(e.target.value)||0)}/>
            <button onClick={onPlus}><Icon name="plus" size={14}/></button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={initialAdd}>
            <Icon name="plus" size={14}/> {pkgQty > 1 ? `Añadir caja (${pkgQty})` : 'Añadir'}
          </button>
        )}
      </div>
    </div>
  );
}

// Exportada para usarla en ProductModal
export { ProductImage };
