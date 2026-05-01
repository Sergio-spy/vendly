import { useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductCard, ProductRow } from '../components/ProductCard';

export function Catalog({ view, cart, updateCartQty, client, openProduct, cardSize, products = [], tariffMult = {}, families = [], showStock = false }) {
  const [familyKey, setFamilyKey] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);

  const familyByKey = new Map(families.map(f => [f.key, f]));
  const selected = familyByKey.get(familyKey);
  const selectedIds = selected?.descendantIds;

  const tariff = client?.tariff || 'T2';
  let prods = products.filter(p => {
    if (familyKey === 'all') return true;
    return selectedIds ? selectedIds.includes(p.family) : false;
  });
  if (q) prods = prods.filter(p => (p.name + p.sku + p.brand).toLowerCase().includes(q.toLowerCase()));
  if (onlyOffer) prods = prods.filter(p => p.oferta || p.promo);
  if (onlyStock) prods = prods.filter(p => p.stock > 0);
  if (sort === 'price') prods = [...prods].sort((a,b)=>a.pvp-b.pvp);
  if (sort === 'stock') prods = [...prods].sort((a,b)=>b.stock-a.stock);

  // Para single-variant productos, el id de carrito es la odooId (variante).
  // Para multi-variant, el comercial debe abrir el modal y elegir variante.
  const buildItemInfo = (p) => ({
    templateId: p.templateId ?? p.odooId,
    name: p.name,
    price: p.pvp,
    sku: p.sku,
    ean: p.ean,
    color: p.color,
    glyph: p.glyph,
  });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', height:'100%' }}>
      <aside style={{ borderRight:'1px solid var(--border)', background:'var(--surface)', padding: 16, overflowY:'auto' }}>
        <div className="t-tiny" style={{ marginBottom: 10 }}>Familias</div>
        <div className="vstack" style={{ gap: 2 }}>
          <button
            onClick={()=>setFamilyKey('all')}
            className="sb-item"
            data-active={String(familyKey==='all')}
            title="Todas">
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>Todas</span>
            <span className="badge">{products.length}</span>
          </button>
          {families.map(f => (
            <button key={f.key}
              onClick={()=>setFamilyKey(f.key)}
              className="sb-item"
              data-active={String(familyKey===f.key)}
              title={f.name}
              style={{ paddingLeft: 12 + f.depth * 10, alignItems:'flex-start' }}>
              <span style={{ flex:1, minWidth:0, fontWeight: f.hasChildren ? 600 : 500, whiteSpace:'normal', wordBreak:'break-word', lineHeight: 1.3, textAlign:'left' }}>{f.name}</span>
              <span className="badge" style={{ flexShrink: 0 }}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="divider"/>
        <div className="t-tiny" style={{ marginBottom: 10 }}>Filtros rápidos</div>
        <div className="vstack" style={{ gap: 6 }}>
          <label className="hstack" style={{ cursor:'pointer', padding: '6px 10px' }}>
            <input type="checkbox" checked={onlyOffer} onChange={e=>setOnlyOffer(e.target.checked)} style={{ accentColor:'var(--brand-500)', flexShrink: 0 }}/>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Solo oferta / promo</span>
          </label>
          {showStock && (
            <label className="hstack" style={{ cursor:'pointer', padding: '6px 10px' }}>
              <input type="checkbox" checked={onlyStock} onChange={e=>setOnlyStock(e.target.checked)} style={{ accentColor:'var(--brand-500)', flexShrink: 0 }}/>
              <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Con stock</span>
            </label>
          )}
        </div>
      </aside>

      <div style={{ display:'flex', flexDirection:'column', minHeight: 0 }}>
        <div className="hstack" style={{ padding:'14px 22px', borderBottom:'1px solid var(--border)', background:'var(--surface)', gap: 10 }}>
          <div className="input-wrap" style={{ flex:1, maxWidth: 420 }}>
            <Icon name="search" size={16} className="lead" style={{ position:'absolute', left: 12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }}/>
            <input className="input input-search" placeholder="Buscar artículo, SKU, marca…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <select className="input" style={{ width: 160 }} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="name">Ordenar: Nombre</option>
            <option value="price">Precio asc.</option>
            <option value="stock">Stock</option>
          </select>
          <div className="spacer"/>
          <span className="muted t-small">{prods.length} artículos · Tarifa {tariff}</span>
        </div>

        <div className="scroll-y" style={{ flex:1, overflowY:'auto', padding: 22, background:'var(--bg)' }}>
          {view === 'grid' ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'var(--d-gap)' }}>
              {prods.map(p => {
                const isMulti = (p.variantCount ?? 1) > 1;
                const variantId = p.odooId ?? p.id;
                const qty = !isMulti ? (cart[variantId]?.qty || 0) : 0;
                const setQty = (n) => updateCartQty(variantId, n, buildItemInfo(p));
                return <ProductCard key={p.id} p={p} qty={qty} setQty={setQty} isMulti={isMulti} tariff={tariff} tariffMult={tariffMult} onOpen={()=>openProduct(p)} showStock={showStock}/>;
              })}
            </div>
          ) : (
            <div className="vstack" style={{ gap: 8 }}>
              {prods.map(p => {
                const isMulti = (p.variantCount ?? 1) > 1;
                const variantId = p.odooId ?? p.id;
                const qty = !isMulti ? (cart[variantId]?.qty || 0) : 0;
                const setQty = (n) => updateCartQty(variantId, n, buildItemInfo(p));
                return <ProductRow key={p.id} p={p} qty={qty} setQty={setQty} isMulti={isMulti} tariff={tariff} tariffMult={tariffMult} onOpen={()=>openProduct(p)} showStock={showStock}/>;
              })}
            </div>
          )}
          {prods.length === 0 && (
            <div className="empty">
              <div className="empty-ic"><Icon name="search" size={24}/></div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin resultados</div>
              <div className="t-small">Prueba a quitar filtros o buscar otro término.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
