import { useState, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { ProductCard, ProductRow } from '../components/ProductCard';

// Familias derivadas de los productos (se calcula a partir del campo `family`)
function buildFamilies(products) {
  const counts = new Map();
  for (const p of products) counts.set(p.family, (counts.get(p.family) || 0) + 1);
  const labels = { limp:'Limpiadores', desin:'Desinfectantes', celu:'Celulosa & papel', bolsa:'Bolsas & basura', utens:'Utensilios', dispe:'Dispensadores', epi:'EPI & guantes' };
  const fams = [{ id:'all', name:'Todas', count: products.length }];
  for (const [id, count] of counts) fams.push({ id, name: labels[id] || id, count });
  return fams;
}

export function Catalog({ view, cart, setCart, client, openProduct, cardSize, products = [], tariffMult = {} }) {
  const [family, setFamily] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);

  const families = useMemo(() => buildFamilies(products), [products]);

  const tariff = client?.tariff || 'T2';
  let prods = products.filter(p => family==='all' || p.family===family);
  if (q) prods = prods.filter(p => (p.name + p.sku + p.brand).toLowerCase().includes(q.toLowerCase()));
  if (onlyOffer) prods = prods.filter(p => p.oferta || p.promo);
  if (onlyStock) prods = prods.filter(p => p.stock > 0);
  if (sort === 'price') prods = [...prods].sort((a,b)=>a.pvp-b.pvp);
  if (sort === 'stock') prods = [...prods].sort((a,b)=>b.stock-a.stock);

  const setQty = (id, n) => setCart({ ...cart, [id]: n });

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', height:'100%' }}>
      <aside style={{ borderRight:'1px solid var(--border)', background:'var(--surface)', padding: 16, overflowY:'auto' }}>
        <div className="t-tiny" style={{ marginBottom: 10 }}>Familias</div>
        <div className="vstack" style={{ gap: 2 }}>
          {families.map(f => (
            <button key={f.id}
              onClick={()=>setFamily(f.id)}
              className="sb-item"
              data-active={String(family===f.id)}>
              <span>{f.name}</span>
              <span className="badge">{f.count}</span>
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
          <label className="hstack" style={{ cursor:'pointer', padding: '6px 10px' }}>
            <input type="checkbox" checked={onlyStock} onChange={e=>setOnlyStock(e.target.checked)} style={{ accentColor:'var(--brand-500)', flexShrink: 0 }}/>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Con stock</span>
          </label>
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
            <div style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill, minmax(${cardSize}px, 1fr))`, gap:'var(--d-gap)' }}>
              {prods.map(p => (
                <ProductCard key={p.id} p={p} qty={cart[p.id]||0} setQty={n=>setQty(p.id,n)} tariff={tariff} tariffMult={tariffMult} onOpen={()=>openProduct(p)}/>
              ))}
            </div>
          ) : (
            <div className="vstack" style={{ gap: 8 }}>
              {prods.map(p => (
                <ProductRow key={p.id} p={p} qty={cart[p.id]||0} setQty={n=>setQty(p.id,n)} tariff={tariff} tariffMult={tariffMult} onOpen={()=>openProduct(p)}/>
              ))}
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
