import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { ProductImage } from '../components/ProductCard';
import { VariantImg, VariantMosaic } from '../components/VariantMosaic';
import { api } from '../api';
import { eur } from '../lib/format';

const FAMILY_LABELS = { limp:'Limpiadores', desin:'Desinfectantes', celu:'Celulosa & papel', bolsa:'Bolsas & basura', utens:'Utensilios', dispe:'Dispensadores', epi:'EPI & guantes' };

// Modal de detalle de producto.
// - Muestra Referencia (SKU) y EAN visibles para el comercial.
// - Si el template tiene 1 variante: stepper directo, comportamiento clásico.
// - Si tiene >1 variante: descarga las variantes desde /api/product-variants y
//   muestra una lista, cada una con su propio stepper. El carrito guarda la
//   variante elegida con su nombre y atributos.
export function ProductModal({ product, onClose, cart = {}, updateCartQty, tariff, tariffMult = {}, showStock = false, client = null, tariffName = 'Comercial PVP' }) {
  const p = product;
  const isMulti = p ? (p.variantCount ?? 1) > 1 : false;
  const singleVariantIdLocal = p ? (p.odooId ?? p.id) : null;
  const [variants, setVariants] = useState(null); // null = no cargadas, [] = cargadas vacías
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [errorVariants, setErrorVariants] = useState(null);

  useEffect(() => {
    if (!p || !isMulti) { setVariants(null); return; }
    let cancel = false;
    setLoadingVariants(true);
    setErrorVariants(null);
    (async () => {
      try {
        const data = await api.variants(p.templateId, client?.odooId);
        if (!cancel) setVariants(data);
      } catch (e) {
        if (!cancel) setErrorVariants(e.message);
      } finally {
        if (!cancel) setLoadingVariants(false);
      }
    })();
    return () => { cancel = true; };
  }, [p?.templateId, isMulti, client?.odooId]);

  if (!p) return null;
  const price = p.pvp * (tariffMult[tariff] || 1);

  // Si el producto se vende en cajas, el modal opera EXCLUSIVAMENTE por cajas:
  // el stepper representa cajas, no unidades sueltas. El campo `qty` del
  // carrito sigue siendo unidades para que Odoo reciba lo correcto.
  const pkgQty = p.packaging?.qty || 1;

  // Para single variant
  const singleQty = !isMulti ? (cart[singleVariantIdLocal]?.qty || 0) : 0;
  const singleBoxes = pkgQty > 1 ? Math.floor(singleQty / pkgQty) : singleQty;
  const setSingleBoxes = (n) => setSingleQty(Math.max(0, n) * pkgQty);
  const setSingleQty = (n) => updateCartQty(singleVariantIdLocal, n, {
    templateId: p.templateId ?? p.id, name: p.name, price: p.pvp, sku: p.sku, ean: p.ean, color: p.color, glyph: p.glyph,
    packaging: p.packaging || null,
  });

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal" style={{ width: 760, maxHeight: '90vh' }}>
        <div className="hstack" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
          <div className="t-tiny">{p.brand}{p.brand && p.sku ? ' · ' : ''}{p.sku}</div>
          <div className="spacer"/>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap: 0, minHeight: 0, overflow: 'hidden' }}>
          <div className="prod-img" style={{ height: 360, borderRadius: 0 }}>
            {isMulti && (p.variantIds?.length || 0) > 1
              ? <VariantMosaic variantIds={p.variantIds} fallbackGlyph={p.glyph} size="78%" imgSize={256} version={p.imgV}/>
              : <ProductImage p={p}/>}
            {p.promo && <div style={{ position:'absolute', top: 14, left: 14, background:'var(--ink)', color:'white', padding:'5px 11px', borderRadius:'999px', fontWeight: 700, fontSize: 12 }}>{p.promo}</div>}
          </div>
          <div style={{ padding: 22, overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="t-h1" style={{ marginBottom: 8 }}>{p.name}</div>
            <div className="hstack" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {FAMILY_LABELS[p.family] && <span className="tag tag-neutral">{FAMILY_LABELS[p.family]}</span>}
              {p.oferta && <span className="tag tag-success">OFERTA</span>}
              {isMulti && <span className="tag tag-info">{p.variantCount} variantes</span>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div className="t-tiny">REFERENCIA</div>
                <div className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>{p.sku || '—'}</div>
              </div>
              <div>
                <div className="t-tiny">CÓDIGO EAN</div>
                <div className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>{p.ean || '—'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="t-tiny">PRECIO {(tariffName || 'COMERCIAL PVP').toUpperCase()}</div>
                <div className="tabular bold" style={{ fontSize: 22, color: 'var(--brand-700)' }}>{eur(price)}</div>
                {p.packaging && (
                  <div className="t-small" style={{ color: 'var(--ink-3)', marginTop: 4 }}>
                    📦 {p.packaging.name} · <span className="tabular">{eur(price * p.packaging.qty)}</span>
                  </div>
                )}
              </div>
              {showStock && (
                <div>
                  <div className="t-tiny">STOCK TOTAL</div>
                  <div className="tabular bold" style={{ fontSize: 16 }}>{p.stock} ud.</div>
                </div>
              )}
            </div>

            {!isMulti ? (
              <div className="vstack" style={{ gap: 8, marginTop: 8 }}>
                {p.packaging ? (
                  // Solo cajas: el stepper representa cajas y el "Añadir" inicial
                  // suma 1 caja completa.
                  <>
                    <div className="hstack" style={{ gap: 10 }}>
                      <div className="stepper lg">
                        <button onClick={()=>setSingleBoxes(Math.max(0,singleBoxes-1))}><Icon name="minus" size={16}/></button>
                        <input value={singleBoxes} onChange={e=>setSingleBoxes(Math.max(0,parseInt(e.target.value)||0))}/>
                        <button onClick={()=>setSingleBoxes(singleBoxes+1)}><Icon name="plus" size={16}/></button>
                      </div>
                      <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={()=>{ if(singleBoxes===0) setSingleBoxes(1); onClose(); }}>
                        <Icon name="cart" size={16}/> {singleBoxes===0 ? `Añadir caja (${pkgQty} ud)` : 'Actualizar pedido'}
                      </button>
                    </div>
                    <div className="t-tiny" style={{ color:'var(--ink-3)' }}>
                      {singleBoxes > 0 && (
                        <>= <span className="tabular">{singleBoxes * pkgQty} ud</span> · <span className="tabular">{eur(singleBoxes * pkgQty * price)}</span></>
                      )}
                      {singleBoxes === 0 && <>Este producto se vende solo por cajas de {pkgQty} unidades.</>}
                    </div>
                  </>
                ) : (
                  // Producto sin packaging: stepper en unidades sueltas como antes.
                  <div className="hstack" style={{ gap: 10 }}>
                    <div className="stepper lg">
                      <button onClick={()=>setSingleQty(Math.max(0,singleQty-1))}><Icon name="minus" size={16}/></button>
                      <input value={singleQty} onChange={e=>setSingleQty(Math.max(0,parseInt(e.target.value)||0))}/>
                      <button onClick={()=>setSingleQty(singleQty+1)}><Icon name="plus" size={16}/></button>
                    </div>
                    <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={()=>{ if(singleQty===0) setSingleQty(1); onClose(); }}>
                      <Icon name="cart" size={16}/> {singleQty===0?'Añadir al pedido':'Actualizar pedido'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="t-tiny" style={{ marginBottom: 8 }}>VARIANTES DISPONIBLES</div>
                {loadingVariants && <div className="muted t-small">Cargando variantes…</div>}
                {errorVariants && <div className="t-small" style={{ color:'var(--danger)' }}>Error: {errorVariants}</div>}
                {variants && variants.length === 0 && <div className="muted t-small">No hay variantes en Odoo.</div>}
                {variants && variants.length > 0 && (
                  <div className="vstack" style={{ gap: 8 }}>
                    {variants.map(v => {
                      const vQty = cart[v.odooId]?.qty || 0;
                      const vPrice = v.pvp * (tariffMult[tariff] || 1);
                      const setVQty = (n) => updateCartQty(v.odooId, n, {
                        templateId: p.templateId,
                        name: p.name,
                        attrLabel: v.attrLabel,
                        price: v.pvp,
                        sku: v.sku || p.sku,
                        ean: v.ean,
                        color: p.color,
                        glyph: p.glyph,
                        packaging: p.packaging || null,
                      });
                      const noStock = showStock && v.stock === 0;
                      return (
                        <div key={v.id} className="hstack" style={{ padding: '10px 12px', border:'1px solid var(--border)', borderRadius:'var(--r-2)', gap: 12, opacity: noStock ? 0.55 : 1 }}>
                          <div style={{ width: 56, height: 56, flexShrink: 0, border:'1px solid var(--border)', borderRadius: 6, overflow:'hidden' }}>
                            <VariantImg id={v.odooId} glyph={p.glyph} contain="84%" version={v.imgV || p.imgV}/>
                          </div>
                          <div style={{ flex:1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{v.attrLabel || v.name}</div>
                            <div className="t-small">
                              {v.sku && <span className="tabular">Ref: {v.sku}</span>}
                              {v.sku && v.ean && <span> · </span>}
                              {v.ean && <span className="tabular">EAN: {v.ean}</span>}
                              {showStock && <span> · {v.stock} ud.</span>}
                            </div>
                          </div>
                          <div className="tabular bold" style={{ fontSize: 14, color:'var(--brand-700)', minWidth: 70, textAlign: 'right' }}>{eur(vPrice)}</div>
                          {vQty > 0 ? (
                            <div className="stepper active">
                              <button onClick={() => setVQty(Math.max(0, vQty - 1))}><Icon name="minus" size={14}/></button>
                              <input value={vQty} onChange={e => setVQty(Math.max(0, parseInt(e.target.value)||0))}/>
                              <button onClick={() => setVQty(vQty + 1)} disabled={noStock}><Icon name="plus" size={14}/></button>
                            </div>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => setVQty(1)} disabled={noStock}>
                              <Icon name="plus" size={14}/> Añadir
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
