// Configuración de familias del catálogo.
// Cada entrada coincide con una categoría de Odoo (product.category) por su `complete_name`.
// El "/" se interpreta como separador de jerarquía (en Odoo aparece como " / ").
//
// Para añadir/quitar familias, edita la lista. Los IDs se resuelven en tiempo de ejecución.

export const FAMILY_PATHS = [
  'Cubos Y Escurridores',
  'Discos Algodon y Tiras adhesivas',
  'Escobas',
  'Fregonas Algodon',
  'Fregonas Microfibra',
  'Palos Aluminio/Anodizado',
  'Palos Aluminio/ECO/Empuñaduras',
  'Palos Aluminio/ECO/Plastificado',
  'Palos Aluminio/PRO/Empuñaduras',
  'Palos Aluminio/PRO/Plastificado',
  'Palos Metalicos',
  'Plumeros',
  'Recogedores',
  'Toallitas/Adulto',
  'Toallitas/Bebe',
  'Toallitas/Citronela',
  'Toallitas/Gafas',
  'Toallitas/Higiene Femenina',
  'Toallitas/Mascotas',
  'Toallitas/MiAuto',
  'Toallitas/MiCasa',
];

// Glifos / colores en función del nombre. Se usa como placeholder mientras
// no haya imagen real del producto.
const COLOR_PALETTE = [
  '#bce0fa','#d9c5f0','#fcd6b8','#bef0e0','#e8e8e8','#f4f0d9',
  '#dfe6f0','#fceedb','#fff8ec','#d9d9d9','#cae8c8','#fcdcdc','#cfe7f0',
];

function pickColor(seed) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

export function glyphFor(familyName = '') {
  const n = familyName.toLowerCase();
  if (n.includes('toallit')) return 'cloth';
  if (n.includes('escob') || n.includes('plumer') || n.includes('fregon')) return 'mop';
  if (n.includes('cubo')) return 'bucket';
  if (n.includes('recoge') || n.includes('disco')) return 'cloth';
  if (n.includes('palo')) return 'spray';
  return 'box';
}

export function colorFor(familyName = '') {
  return pickColor(familyName || 'default');
}

// Normaliza "Palos Aluminio/ECO/Empuñaduras" → "palos aluminio / eco / empuñaduras"
// para comparar con `complete_name` de Odoo (que usa " / " como separador).
export function normalizePath(path) {
  return path.split('/').map(s => s.trim().toLowerCase()).join(' / ');
}

// Dado el listado de categorías de Odoo, devuelve solo las que matchean la config.
// Cada item: { id, name, completeName, count }
export function resolveFamilies(odooCategories, productsByCategId = new Map()) {
  const wanted = FAMILY_PATHS.map(p => ({ raw: p, norm: normalizePath(p) }));
  const out = [];
  for (const w of wanted) {
    const cat = odooCategories.find(c => {
      const cn = (c.complete_name || c.name || '').toLowerCase();
      return cn.endsWith(w.norm) || cn === w.norm;
    });
    if (!cat) continue;
    out.push({
      id: cat.id,
      name: w.raw, // mostramos el nombre tal y como lo configuraste
      completeName: cat.complete_name || cat.name,
      count: productsByCategId.get(cat.id) || 0,
    });
  }
  return out;
}
