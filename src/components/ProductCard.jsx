import { Icon, ProdGlyph } from './Icon';

export function ProductCard({ p, qty, setQty, tariff, tariffMult = {}, onOpen }) {
  const price = p.pvp * (tariffMult[tariff] || 1);
  const lowStock = p.stock > 0 && p.stock < 20;
  const noStock = p.stock === 0;
  const active = qty > 0;

  return (
    <div className="card prod-card" style={{ width: 'var(--d-card-w)', padding: 'var(--d-pad-card)', display:'flex', flexDirection:'column', gap: 10, position:'relative', cursor:'pointer' }}
         onClick={onOpen}>
      <div className="prod-img" style={{ height: 'var(--d-card-img-h)', background: p.color }}>
        <ProdGlyph kind={p.glyph} size={'62%'} color="rgba(20,24,26,0.55)"/>
        {p.promo && (
          <div style={{ position:'absolute', top: 8, left: 8, background:'var(--ink)', color:'white', fontSize: 10.5, fontWeight: 700, padding:'3px 8px', borderRadius:'999px', letterSpacing:'0.04em' }}>
            {p.promo}
          </div>
        )}
        {p.oferta && !p.promo && (
          <div className="tag tag-success" style={{ position:'absolute', top: 8, left: 8 }}>OFERTA</div>
        )}
        {noStock && (
          <div style={{ position:'absolute', inset: 0, background:'rgba(247,248,246,0.7)', display:'grid', placeItems:'center' }}>
            <span className="tag tag-danger">Sin stock</span>
          </div>
        )}
      </div>

      <div style={{ minHeight: 38 }}>
        <div className="t-tiny" style={{ marginBottom: 2 }}>{p.brand} · {p.sku}</div>
        <div style={{ fontSize: 'var(--d-fs-title)', fontWeight: 600, lineHeight: 1.25, textWrap:'pretty' }}>{p.name}</div>
      </div>

      <div className="hstack" style={{ justifyContent:'space-between', marginTop:'auto', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 'var(--d-fs-num)', whiteSpace: 'nowrap' }} className="tabular">{price.toFixed(2)} €</div>
          <div className="t-small tabular" style={{ color: lowStock ? 'var(--warn)' : noStock ? 'var(--danger)' : 'var(--ink-4)', whiteSpace: 'nowrap' }}>
            <span className={`dot ${lowStock?'dot-warn':noStock?'dot-danger':'dot-success'}`} style={{ display:'inline-block', marginRight:6, verticalAlign:'middle' }}/>
            {noStock ? 'sin stock' : `${p.stock} ud.`}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          {active ? (
            <div className="stepper active">
              <button onClick={() => setQty(Math.max(0, qty - 1))}><Icon name="minus" size={14}/></button>
              <input value={qty} onChange={e => setQty(Math.max(0, parseInt(e.target.value)||0))}/>
              <button onClick={() => setQty(qty + 1)} disabled={noStock}><Icon name="plus" size={14}/></button>
            </div>
          ) : (
            <button className="qty-add" onClick={() => setQty(1)} disabled={noStock}>
              <Icon name="plus" size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductRow({ p, qty, setQty, tariff, tariffMult = {}, onOpen }) {
  const price = p.pvp * (tariffMult[tariff] || 1);
  const noStock = p.stock === 0;
  const lowStock = p.stock > 0 && p.stock < 20;
  return (
    <div className="card" style={{ padding: 'var(--d-pad-row) 14px', display:'grid', gridTemplateColumns:'48px 1fr 110px 90px 130px', alignItems:'center', gap: 14, cursor:'pointer' }} onClick={onOpen}>
      <div className="prod-img" style={{ width: 48, height: 48, background: p.color }}>
        <ProdGlyph kind={p.glyph} size={32} color="rgba(20,24,26,0.55)"/>
      </div>
      <div>
        <div className="t-tiny">{p.brand} · {p.sku}</div>
        <div style={{ fontWeight: 600, fontSize: 'var(--d-fs-title)' }}>{p.name}</div>
      </div>
      <div className="tabular" style={{ fontWeight: 700 }}>{price.toFixed(2)} €</div>
      <div className="tabular" style={{ color: lowStock ? 'var(--warn)' : noStock ? 'var(--danger)' : 'var(--ink-3)', fontSize: 13 }}>
        <span className={`dot ${lowStock?'dot-warn':noStock?'dot-danger':'dot-success'}`} style={{ display:'inline-block', marginRight:6, verticalAlign:'middle' }}/>
        {noStock ? 'sin stock' : `${p.stock} ud.`}
      </div>
      <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'flex-end' }}>
        {qty > 0 ? (
          <div className="stepper active">
            <button onClick={() => setQty(Math.max(0, qty - 1))}><Icon name="minus" size={14}/></button>
            <input value={qty} onChange={e => setQty(Math.max(0, parseInt(e.target.value)||0))}/>
            <button onClick={() => setQty(qty + 1)} disabled={noStock}><Icon name="plus" size={14}/></button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setQty(1)} disabled={noStock}>
            <Icon name="plus" size={14}/> Añadir
          </button>
        )}
      </div>
    </div>
  );
}
