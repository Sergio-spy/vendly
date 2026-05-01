// Configuración de familias del catálogo.
// Cada entrada coincide con una categoría de Odoo (product.category) por su `complete_name`.
// El "/" se interpreta como separador de jerarquía (en Odoo aparece como " / ").
//
// Para añadir/quitar familias, edita la lista. Los IDs se resuelven en tiempo de ejecución.

export const FAMILY_PATHS = [
  'Cubos Y Escurridores',
  'Discos Algodon y Tiras adhesivas',
  'Escobas',
  'Fregonas Algodón',
  'Fregonas Microfibra',
  'Palos Aluminio/Anodizado',
  'Palos Aluminio/ECO/Empuñaduras',
  'Palos Aluminio/ECO/Plastificado',
  'Palos Aluminio/PRO/Empuñaduras',
  'Palos Aluminio/PRO/Plastificado',
  'Palos Metálicos',
  'Plumeros',
  'Recogedores',
  'Toallitas/Adultos',
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

// Normaliza para comparar: separador uniforme, minúsculas, sin tildes ni espacios extra.
// Hace tolerante el matching ante variaciones (Algodon vs Algodón, etc.).
function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
export function normalizePath(path) {
  return stripDiacritics(path).split('/').map(s => s.trim().toLowerCase()).join(' / ');
}

// Dado el listado de categorías de Odoo, devuelve un árbol aplanado en preorden.
// Cada item: { key, name, depth, odooId, count, descendantIds, hasChildren }
//   key             string único por nodo (ruta completa)
//   name            último segmento del path (lo que se muestra)
//   depth           0 = raíz; sirve para indentar en el rail
//   odooId          id real de la categoría Odoo (solo si el path es hoja matcheada)
//   count           productos del nodo + de sus descendientes
//   descendantIds   ids Odoo de este nodo y todos los hijos (para filtrar productos)
//   hasChildren     true si tiene hijos en el árbol
export function resolveFamilies(odooCategories, productsByCategId = new Map()) {
  const wanted = FAMILY_PATHS.map(p => ({
    raw: p,
    segments: p.split('/').map(s => s.trim()).filter(Boolean),
    norm: normalizePath(p),
  }));

  const nodes = new Map(); // key -> node
  const ensureNode = (segments, depth) => {
    const key = segments.slice(0, depth + 1).join('/');
    if (nodes.has(key)) return nodes.get(key);
    const node = {
      key,
      name: segments[depth],
      depth,
      parentKey: depth > 0 ? segments.slice(0, depth).join('/') : null,
      odooId: null,
      ownCount: 0,
      childKeys: [],
    };
    nodes.set(key, node);
    if (node.parentKey && nodes.has(node.parentKey)) {
      nodes.get(node.parentKey).childKeys.push(key);
    }
    return node;
  };

  const rootOrder = [];
  const seenRoots = new Set();
  for (const w of wanted) {
    const cat = odooCategories.find(c => {
      const cn = stripDiacritics(c.complete_name || c.name || '').toLowerCase();
      return cn.endsWith(w.norm) || cn === w.norm;
    });
    if (!cat) continue;

    for (let i = 0; i < w.segments.length; i++) ensureNode(w.segments, i);
    const leaf = nodes.get(w.segments.join('/'));
    leaf.odooId = cat.id;
    leaf.ownCount = productsByCategId.get(cat.id) || 0;

    const root = w.segments[0];
    if (!seenRoots.has(root)) { seenRoots.add(root); rootOrder.push(root); }
  }

  // Roll up counts y descendantIds
  const aggregate = (key) => {
    const n = nodes.get(key);
    let count = n.odooId != null ? n.ownCount : 0;
    const ids = n.odooId != null ? [n.odooId] : [];
    for (const c of n.childKeys) {
      const r = aggregate(c);
      count += r.count;
      ids.push(...r.ids);
    }
    n.totalCount = count;
    n.descendantIds = ids;
    return { count, ids };
  };
  for (const r of rootOrder) aggregate(r);

  // Flatten en preorden (estable: hijos en orden de inserción → orden de FAMILY_PATHS)
  const out = [];
  const visit = (key) => {
    const n = nodes.get(key);
    out.push({
      key: n.key,
      name: n.name,
      depth: n.depth,
      odooId: n.odooId,
      count: n.totalCount,
      descendantIds: n.descendantIds,
      hasChildren: n.childKeys.length > 0,
    });
    for (const c of n.childKeys) visit(c);
  };
  for (const r of rootOrder) visit(r);

  return out;
}
