// Mosaico 2x2 de variantes para tarjetas multi-variante del catálogo.
// Recibe { variantIds, fallbackGlyph } y muestra hasta 4 imágenes reales de
// las primeras variantes. Si hay menos de 4, las celdas vacías quedan en
// gris claro para mantener la simetría.

import { useState } from 'react';
import { ProdGlyph } from './Icon';
import { productImageUrl } from '../api';

function VariantImg({ id, glyph, contain = '80%', imgUrl = productImageUrl }) {
  const [failed, setFailed] = useState(false);
  if (failed || !id) return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <ProdGlyph kind={glyph} size="50%" color="rgba(20,24,26,0.4)"/>
    </div>
  );
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <img
        src={imgUrl(id)}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ maxWidth: contain, maxHeight: contain, objectFit:'contain' }}
      />
    </div>
  );
}

export function VariantMosaic({ variantIds = [], fallbackGlyph = 'box', size = '80%', imgUrl }) {
  const slice = variantIds.slice(0, 4);
  while (slice.length < 4) slice.push(null);
  return (
    <div style={{ width:'100%', height:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr', gap: 2, background:'#e8e8e8' }}>
      {slice.map((id, i) => (
        <VariantImg key={id ?? `e${i}`} id={id} glyph={fallbackGlyph} contain={size} imgUrl={imgUrl}/>
      ))}
    </div>
  );
}

// También exportamos VariantImg porque el modal lo usa para el thumbnail
// individual de cada variante listada.
export { VariantImg };
