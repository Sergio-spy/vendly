import { useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductCard, ProductRow } from '../components/ProductCard';

export function Catalog({ view, cart, updateCartQty, client, openProduct, cardSize, products = [], tariffMult = {}, families = [], showStock = false, isPortal = false }) {
  const [familyKey, setFamilyKey] = useState('all');
  const [railOpen, setRailOpen] = useState(false);
  // Cuando se elige una familia, en móvil cerramos el drawer del rail.
  const pickFamily = (k) => { pickFamily(k); setRailOpen(false); };
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);

  const familyByKey = new Map(families.map(f => [f.key, f]));
  const selected = familyByKey.get(familyKey);
  const selectedIds = selected?.descendantIds;

  // Conteo real en el rail desde el dataset que sí se muestra (ya filtrado por
  // "agujero" en palos aluminio, etc.). Solo en hojas; los nodos padre no
  // muestran contador porque sería la suma de hijos y entorpece la lectura.
  const productsByCategId = new Map();
  for (const p of products) {
    productsByCategId.set(p.family, (productsByCategId.get(p.family) || 0) + 1);
  }

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
    // packaging viaja con la línea para que el carrito pueda mostrar y operar
    // por cajas (impedir cantidades sueltas, ver número de cajas, etc.).
    packaging: p.packaging || null,
  });

  return (
    <div className="catalog-layout" data-rail-open={railOpen ? 'true' : 'false'} style={{ display:'grid', gridTemplateColumns:'240px 1fr', height:'100%' }} onClick={(e)=>{ if (railOpen && e.target === e.currentTarget) setRailOpen(false); }}>
      <aside className="catalog-rail" style={{ borderRight:'1px solid var(--border)', background:'var(--surface)', padding: 12, overflowY:'auto' }}>
        <div className="t-tiny" style={{ marginBottom: 8 }}>Familias</div>
        <div className="vstack" style={{ gap: 0 }}>
          <button
            onClick={()=>pickFamily('all')}
            className="sb-item rail-item"
            data-active={String(familyKey==='all')}
            title="Todas">
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>Todas</span>
            <span className="badge">{products.length}</span>
          </button>
          {families.map(f => {
            const leafCount = !f.hasChildren ? (productsByCategId.get(f.odooId) || 0) : null;
            return (
              <button key={f.key}
                onClick={()=>pickFamily(f.key)}
                className="sb-item rail-item"
                data-active={String(familyKey===f.key)}
                data-parent={String(f.hasChildren)}
                title={f.name}
                style={{ paddingLeft: 10 + f.depth * 10 }}>
                <span style={{ flex:1, minWidth:0, whiteSpace:'normal', wordBreak:'break-word', textAlign:'left' }}>{f.name}</span>
                {leafCount != null && <span className="badge" style={{ flexShrink: 0 }}>{leafCount}</span>}
              </button>
            );
          })}
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
        <div className="hstack catalog-topbar" style={{ padding:'14px 22px', borderBottom:'1px solid var(--border)', background:'var(--surface)', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm catalog-rail-toggle" onClick={()=>setRailOpen(v=>!v)}>
            <Icon name="filter" size={14}/> Familias
          </button>
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
          <span className="muted t-small">{prods.length} artículos{!isPortal ? ` · Tarifa ${tariff}` : ''}</span>
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
