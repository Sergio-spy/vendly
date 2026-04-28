// Datos mock — espejo del catálogo de prueba (sector limpieza profesional).
// Se usan cuando MOCK_MODE === true (sin credenciales Odoo).

export const CLIENTS = [
  { id:'C01', code:'10245', name:'Hostelería Mediterránea S.L.', cif:'B-78521340', city:'Valencia', address:'Polígono Vara de Quart 24', tariff:'T2', credit:8400, balance:1240.5, paymentTerm:'30 días', lastOrder:'2026-04-14', status:'al-dia', totalYtd:18420.30, contact:'María Tudela', phone:'+34 961 234 102' },
  { id:'C02', code:'10247', name:'Limpiezas Roma 24h S.A.', cif:'A-46781209', city:'Castellón', address:'C/ Major 142', tariff:'T1', credit:12000, balance:0, paymentTerm:'60 días', lastOrder:'2026-04-22', status:'al-dia', totalYtd:32100.00, contact:'Joan Roig', phone:'+34 964 502 001' },
  { id:'C03', code:'10301', name:'Residencia Els Tarongers', cif:'B-46789021', city:'Alzira', address:'Av. La Ribera 8', tariff:'T2', credit:5000, balance:340.20, paymentTerm:'30 días', lastOrder:'2026-04-25', status:'al-dia', totalYtd:9420.10, contact:'Empar Vidal', phone:'+34 962 410 209' },
  { id:'C04', code:'10322', name:'Higiene Mar Blau S.L.', cif:'B-12780954', city:'Gandia', address:'C/ Marítim 45', tariff:'T3', credit:3500, balance:2890.00, paymentTerm:'30 días', lastOrder:'2026-03-12', status:'pendiente', totalYtd:6210.00, contact:'Pep Boronat', phone:'+34 962 871 540' },
  { id:'C05', code:'10408', name:'Hotel Vall del Túria', cif:'A-46211087', city:'Valencia', address:'C/ Sorní 14', tariff:'T1', credit:15000, balance:0, paymentTerm:'45 días', lastOrder:'2026-04-26', status:'al-dia', totalYtd:24210.50, contact:'Anna Soler', phone:'+34 961 020 401' },
  { id:'C06', code:'10501', name:'NetegesPro Castelló', cif:'B-12459807', city:'Castellón', address:'Pol. Ind. El Serrallo 12', tariff:'T2', credit:7500, balance:0, paymentTerm:'30 días', lastOrder:'2026-04-11', status:'al-dia', totalYtd:12340.00, contact:'Vicent Llopis', phone:'+34 964 209 410' },
  { id:'C07', code:'10612', name:'Geriátric Sant Vicent', cif:'G-46781020', city:'Sueca', address:'C/ Hospital 3', tariff:'T2', credit:4000, balance:780.00, paymentTerm:'30 días', lastOrder:'2026-04-08', status:'al-dia', totalYtd:7820.30, contact:'Lourdes Pla', phone:'+34 961 740 220' },
  { id:'C08', code:'10708', name:'Restaurant La Marina', cif:'B-46210945', city:'Cullera', address:'Passeig Marítim 18', tariff:'T3', credit:2500, balance:1410.00, paymentTerm:'15 días', lastOrder:'2026-04-02', status:'pendiente', totalYtd:4210.00, contact:'Quim Bertí', phone:'+34 962 301 100' },
];

export const TARIFFS = [
  { id:'T1', name:'Tarifa Premium',    desc:'Grandes cuentas · -8% sobre PVP', clients:18, color:'#1d7f50', mult:0.92 },
  { id:'T2', name:'Tarifa Estándar',   desc:'PVP de catálogo',                  clients:42, color:'#2473c5', mult:1.00 },
  { id:'T3', name:'Tarifa Minorista',  desc:'Volumen pequeño · +6% sobre PVP', clients:12, color:'#c97a17', mult:1.06 },
];

export const FAMILIES = [
  { id:'all',     name:'Todas',           count:124 },
  { id:'limp',    name:'Limpiadores',     count:38 },
  { id:'desin',   name:'Desinfectantes',  count:22 },
  { id:'celu',    name:'Celulosa & papel',count:18 },
  { id:'bolsa',   name:'Bolsas & basura', count:14 },
  { id:'utens',   name:'Utensilios',      count:19 },
  { id:'dispe',   name:'Dispensadores',   count:9 },
  { id:'epi',     name:'EPI & guantes',   count:4 },
];

export const PRODUCTS = [
  { id:'P001', sku:'LIM-001', name:'Detergente neutro Profesional 5L',   family:'limp',  brand:'Cleanex',   pvp:18.40, stock:124, oferta:false, promo:null, color:'#bce0fa', glyph:'bottle' },
  { id:'P002', sku:'LIM-002', name:'Fregasuelos perfumado lavanda 5L',   family:'limp',  brand:'Cleanex',   pvp:14.20, stock:68,  oferta:true,  promo:'2x1', color:'#d9c5f0', glyph:'bottle' },
  { id:'P003', sku:'LIM-003', name:'Desengrasante cocina industrial 5L', family:'limp',  brand:'NetMax',    pvp:22.90, stock:42,  oferta:false, promo:null, color:'#fcd6b8', glyph:'bottle' },
  { id:'P004', sku:'LIM-004', name:'Limpiacristales pistola 750ml',      family:'limp',  brand:'NetMax',    pvp:3.40,  stock:312, oferta:false, promo:null, color:'#bef0e0', glyph:'spray' },
  { id:'P005', sku:'LIM-005', name:'Abrillantador inox 750ml',           family:'limp',  brand:'PolyBrill', pvp:5.80,  stock:88,  oferta:false, promo:null, color:'#e8e8e8', glyph:'spray' },
  { id:'P006', sku:'LIM-006', name:'Limpiador baño antical 1L',          family:'limp',  brand:'Cleanex',   pvp:6.20,  stock:0,   oferta:false, promo:null, color:'#bce0fa', glyph:'bottle' },
  { id:'P007', sku:'DES-001', name:'Lejía concentrada 5L',                family:'desin', brand:'Hidroxa',   pvp:9.80,  stock:96,  oferta:false, promo:null, color:'#f4f0d9', glyph:'jug' },
  { id:'P008', sku:'DES-002', name:'Hipoclorito virucida 5L (EN-14476)',  family:'desin', brand:'Hidroxa',   pvp:18.90, stock:54,  oferta:false, promo:'-15%', color:'#f4f0d9', glyph:'jug' },
  { id:'P009', sku:'DES-003', name:'Alcohol etílico 70º · 1L',             family:'desin', brand:'PureMed',   pvp:5.20,  stock:140, oferta:false, promo:null, color:'#dfe6f0', glyph:'bottle' },
  { id:'P010', sku:'DES-004', name:'Gel hidroalcohólico 500ml',            family:'desin', brand:'PureMed',   pvp:4.10,  stock:210, oferta:true,  promo:null, color:'#dfe6f0', glyph:'bottle' },
  { id:'P011', sku:'DES-005', name:'Amonio cuaternario bactericida 5L',    family:'desin', brand:'Hidroxa',   pvp:24.50, stock:28,  oferta:false, promo:null, color:'#f4f0d9', glyph:'jug' },
  { id:'P012', sku:'CEL-001', name:'Papel higiénico industrial 18 rollos', family:'celu',  brand:'PaperPro',  pvp:24.50, stock:142, oferta:false, promo:null, color:'#fceedb', glyph:'roll' },
  { id:'P013', sku:'CEL-002', name:'Bobina secamanos 2 capas · pack 6',    family:'celu',  brand:'PaperPro',  pvp:32.80, stock:78,  oferta:false, promo:null, color:'#fceedb', glyph:'roll' },
  { id:'P014', sku:'CEL-003', name:'Servilletas barra blancas · 2.500u',   family:'celu',  brand:'PaperPro',  pvp:14.40, stock:212, oferta:false, promo:null, color:'#fff8ec', glyph:'box' },
  { id:'P015', sku:'CEL-004', name:'Mantel papel 30g · rollo 100m',         family:'celu',  brand:'PaperPro',  pvp:11.90, stock:9,   oferta:false, promo:null, color:'#fceedb', glyph:'roll' },
  { id:'P016', sku:'BOL-001', name:'Bolsa basura 100L · galga 200',         family:'bolsa', brand:'PolyEco',   pvp:18.30, stock:184, oferta:false, promo:null, color:'#d9d9d9', glyph:'bag' },
  { id:'P017', sku:'BOL-002', name:'Bolsa autocierre 30L · pack 25u',       family:'bolsa', brand:'PolyEco',   pvp:6.40,  stock:96,  oferta:false, promo:null, color:'#d9d9d9', glyph:'bag' },
  { id:'P018', sku:'BOL-003', name:'Bolsa compostable 10L · pack 50u',      family:'bolsa', brand:'PolyEco',   pvp:8.90,  stock:54,  oferta:true,  promo:null, color:'#cae8c8', glyph:'bag' },
  { id:'P019', sku:'UTE-001', name:'Mopa microfibra 40cm · azul',           family:'utens', brand:'CleanTool', pvp:7.20,  stock:122, oferta:false, promo:null, color:'#bce0fa', glyph:'mop' },
  { id:'P020', sku:'UTE-002', name:'Cubo fregona 25L con escurridor',       family:'utens', brand:'CleanTool', pvp:24.80, stock:18,  oferta:false, promo:null, color:'#fcd6b8', glyph:'bucket' },
  { id:'P021', sku:'UTE-003', name:'Bayeta multiuso microfibra · pack 10',  family:'utens', brand:'CleanTool', pvp:9.40,  stock:240, oferta:false, promo:null, color:'#fcdcdc', glyph:'cloth' },
  { id:'P022', sku:'DIS-001', name:'Dispensador papel mecha 400m',          family:'dispe', brand:'DispenSys', pvp:42.00, stock:14,  oferta:false, promo:null, color:'#e8e8e8', glyph:'box' },
  { id:'P023', sku:'DIS-002', name:'Dosificador jabón rellenable 1L',       family:'dispe', brand:'DispenSys', pvp:18.40, stock:32,  oferta:false, promo:null, color:'#e8e8e8', glyph:'box' },
  { id:'P024', sku:'EPI-001', name:'Guantes nitrilo azul · talla M · 100u', family:'epi',   brand:'SafeHand',  pvp:11.80, stock:0,   oferta:false, promo:null, color:'#cfe7f0', glyph:'glove' },
];

export const PROMOS = [
  { id:'PR1', title:'2x1 en Fregasuelos lavanda',       sku:'P002', kind:'2x1',   end:'2026-05-15', stock:68 },
  { id:'PR2', title:'-15% en Hipoclorito virucida 5L',  sku:'P008', kind:'-15%',  end:'2026-05-31', stock:54 },
  { id:'PR3', title:'Pack ahorro Bolsa compostable',     sku:'P018', kind:'PACK',  end:'2026-06-10', stock:54 },
  { id:'PR4', title:'-10% lote Gel hidroalcohólico ≥12u', sku:'P010', kind:'VOL',  end:'2026-05-20', stock:210 },
];

export const ORDERS = [
  { id:'PD-2604-018', client:'C05', date:'2026-04-26', total:1284.40, lines:14, status:'exportado' },
  { id:'PD-2604-017', client:'C03', date:'2026-04-25', total:412.80,  lines:6,  status:'exportado' },
  { id:'PD-2604-014', client:'C01', date:'2026-04-22', total:892.10,  lines:9,  status:'exportado' },
  { id:'PD-2604-011', client:'C02', date:'2026-04-22', total:2410.50, lines:18, status:'pendiente' },
  { id:'PD-2604-009', client:'C06', date:'2026-04-19', total:684.30,  lines:11, status:'exportado' },
  { id:'PD-2604-006', client:'C01', date:'2026-04-14', total:312.00,  lines:4,  status:'exportado' },
  { id:'PD-2604-002', client:'C07', date:'2026-04-08', total:512.40,  lines:7,  status:'borrador' },
];

export const KPI = {
  monthRevenue: 32420.50,
  monthGoal: 45000,
  monthOrders: 38,
  monthClients: 24,
  pendingOrders: 5,
  pendingCollections: 4150.20,
};
