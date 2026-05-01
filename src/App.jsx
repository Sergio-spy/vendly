import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ApiKeyBanner } from './components/ApiKeyBanner';
import { LoginScreen } from './screens/LoginScreen';
import { Dashboard } from './screens/Dashboard';
import { Catalog } from './screens/Catalog';
import { ClientPicker } from './screens/ClientPicker';
import { OrderDrawer } from './screens/OrderDrawer';
import { ProductModal } from './screens/ProductModal';
import { OrderDetailModal } from './screens/OrderDetailModal';
import { OrdersScreen, ClientsScreen, TariffsScreen, PromosScreen, StockScreen, CollectScreen, KpiScreen, AdminScreen } from './screens/OtherScreens';
import { api, auth } from './api';

function buildTariffMult(tariffs) {
  const map = {};
  for (const t of tariffs) map[t.id] = t.mult ?? 1;
  return map;
}

export default function App() {
  const [density] = useState('regular');
  const [view] = useState('grid');
  const [cardSize] = useState(210);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('vendly_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c;
    try { localStorage.setItem('vendly_sidebar_collapsed', next ? '1' : '0'); } catch {}
    return next;
  });

  const [salesman, setSalesman] = useState(null); // null = no logueado
  const [bootDone, setBootDone] = useState(false);

  const [route, setRoute] = useState('dashboard');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [cart, setCart] = useState({});

  const [products, setProducts] = useState([]);
  const [clients, setClients]   = useState([]);
  const [tariffs, setTariffs]   = useState([]);
  const [promos, setPromos]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [families, setFamilies] = useState([]);
  const [client, setClient]     = useState(null);
  const [mode, setMode]         = useState('…');
  const [health, setHealth]     = useState(null);
  const [error, setError]       = useState(null);

  // Boot: si hay token guardado, intentamos /api/auth/me; si va, cargamos datos.
  useEffect(() => {
    const onForceLogout = () => { setSalesman(null); setBootDone(true); };
    window.addEventListener('vendly-logout', onForceLogout);
    return () => window.removeEventListener('vendly-logout', onForceLogout);
  }, []);

  useEffect(() => {
    (async () => {
      if (!auth.getToken()) { setBootDone(true); return; }
      try {
        const me = await api.me();
        setSalesman(me);
      } catch {
        auth.clear();
      } finally {
        setBootDone(true);
      }
    })();
  }, []);

  // Cuando hay comercial autenticado, cargamos los datos.
  // Reintenta una vez si falla — protege contra cold-starts simultáneos
  // de Vercel Functions y rate-limit puntual al autenticar en Odoo.
  useEffect(() => {
    if (!salesman) return;
    let cancel = false;
    const fetchAll = () => Promise.all([
      api.health(), api.products(), api.clients(), api.tariffs(), api.promos(), api.orders(), api.families(),
    ]);
    (async () => {
      let result;
      try {
        result = await fetchAll();
      } catch {
        await new Promise(r => setTimeout(r, 800));
        try {
          result = await fetchAll();
        } catch (e) {
          if (!cancel) setError(e.message);
          return;
        }
      }
      if (cancel) return;
      const [h, prods, cls, tfs, prs, ords, fams] = result;
      setMode(h.mode);
      setHealth(h);
      setProducts(prods);
      setClients(cls);
      setTariffs(tfs);
      setPromos(prs);
      setOrders(ords);
      setFamilies(fams);
      setClient(null);
      setCart({});
    })();
    return () => { cancel = true; };
  }, [salesman]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const tariffMult = useMemo(() => buildTariffMult(tariffs), [tariffs]);
  const tariff = client?.tariff || 'T2';
  // Cart entries: { [variantOdooId]: { qty, templateId, name, attrLabel?, price, sku, ean?, color?, glyph? } }
  const lines = Object.entries(cart).filter(([,e]) => e?.qty > 0);
  const orderTotal = lines.reduce((a,[,e]) => a + (e.price * (tariffMult[tariff]||1) * e.qty), 0) * 1.21;

  // Helper para añadir / actualizar cantidad de una variante en el carrito.
  // qty=0 elimina la línea. info se mezcla en la entrada (nombre, precio, etc.).
  const updateCartQty = (variantId, qty, info = null) => {
    if (!variantId) return;
    setCart(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[variantId];
      else next[variantId] = { ...prev[variantId], ...(info || {}), qty };
      return next;
    });
  };

  const titles = {
    dashboard:'Inicio', catalog:'Catálogo', orders:'Pedidos', clients:'Clientes',
    tariffs:'Tarifas', promos:'Promociones', stock:'Stock', collect:'Cobros',
    kpi:'Mi rendimiento', admin:'Administración'
  };

  const onConfirm = async () => {
    const payload = {
      partnerId: client?.odooId || null,
      pricelistId: tariffs.find(t=>t.id===tariff)?.odooId || null,
      lines: lines.map(([variantId, e]) => ({ productId: Number(variantId), qty: e.qty })),
    };
    try {
      if (editingOrderId) {
        await api.updateOrder(editingOrderId, payload);
      } else {
        await api.createOrder(payload);
      }
      const fresh = await api.orders();
      setOrders(fresh);
    } catch (e) {
      // Solo en modo mock o error puntual: dejamos un borrador local para no perder el trabajo.
      if (!editingOrderId) {
        const id = 'PD-' + Math.floor(Math.random()*9000+1000);
        setOrders([{ id, client: client?.id, date: new Date().toISOString().slice(0,10), total: orderTotal, lines: lines.length, status:'borrador' }, ...orders]);
      } else {
        alert('No se pudo guardar el pedido: ' + e.message);
        return;
      }
    }
    setCart({});
    setClient(null);
    setEditingOrderId(null);
    setOrderOpen(false);
    setRoute('orders');
  };

  // Reabre un pedido borrador como carrito para editarlo.
  const onEditOrder = async (orderRow) => {
    if (orderRow.status !== 'borrador') {
      alert('Solo se pueden editar pedidos en estado borrador.');
      return;
    }
    try {
      const detail = await api.order(orderRow.odooId);
      const newCart = {};
      for (const l of detail.lines || []) {
        if (!l.productId) continue;
        newCart[l.productId] = {
          qty: l.qty,
          name: l.productName || l.description,
          price: l.price,
          sku: '', ean: '',
        };
      }
      // Cliente: buscar en la lista cargada por id Odoo.
      const partnerId = orderRow.client; // formato C{id}
      const cl = clients.find(x => x.id === partnerId);
      setClient(cl || null);
      setCart(newCart);
      setEditingOrderId(orderRow.odooId);
      setOrderOpen(true);
      setRoute('catalog');
    } catch (e) {
      alert('No se pudo abrir el pedido: ' + e.message);
    }
  };

  const onLogout = () => { auth.clear(); setSalesman(null); setProducts([]); setClients([]); setOrders([]); };

  // ── Renders ──
  if (!bootDone) {
    return <div style={{ height:'100%', display:'grid', placeItems:'center', color:'var(--ink-4)' }}>Cargando…</div>;
  }

  if (!salesman) return <LoginScreen onLogin={(c)=>setSalesman(c)}/>;

  if (error) return (
    <div style={{ padding: 40, fontFamily:'var(--font-sans)' }}>
      <div className="t-h1" style={{ marginBottom: 8 }}>Error cargando la API</div>
      <div className="t-small" style={{ color:'var(--danger)' }}>{error}</div>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onLogout}>Cerrar sesión</button>
    </div>
  );

  return (
    <div className="app" data-collapsed={collapsed ? 'true' : 'false'}>
      <Sidebar route={route} setRoute={setRoute} salesman={salesman} orderCount={orders.filter(o=>o.status==='borrador').length} onLogout={onLogout} collapsed={collapsed}/>
      <div className="app-main">
        <Topbar
          title={titles[route]}
          client={client}
          setClientPickerOpen={setPickerOpen}
          online={true}
          lastSync={mode === 'odoo' ? 'Odoo · live' : 'modo mock'}
          orderTotal={orderTotal}
          orderLines={lines.length}
          onOpenOrder={()=>setOrderOpen(true)}
          onToggleSidebar={toggleCollapsed}
        />
        <ApiKeyBanner health={health} isAdmin={salesman.role==='admin'}/>
        <div className="app-content">
          {route==='dashboard' && <Dashboard setRoute={setRoute} salesman={salesman} client={client} recentOrders={orders} clients={clients} promos={promos} products={products}/>}
          {route==='catalog'   && <Catalog view={view} cart={cart} updateCartQty={updateCartQty} client={client} openProduct={setProductOpen} cardSize={cardSize} density={density} products={products} tariffMult={tariffMult} families={families} showStock={salesman.role==='admin'}/>}
          {route==='orders'    && <OrdersScreen orders={orders} clients={clients} onNew={()=>setRoute('catalog')} onRefresh={async()=>{ const fresh = await api.orders(); setOrders(fresh); }} onView={(o)=>setOrderDetailOpen(o)} onEdit={onEditOrder}/>}
          {route==='clients'   && <ClientsScreen clients={clients} tariffs={tariffs} onPick={c=>{setClient(c); setRoute('catalog');}} onRefresh={async()=>{ const fresh = await api.clients(); setClients(fresh); }}/>}
          {route==='tariffs'   && <TariffsScreen tariffs={tariffs} products={products} clients={clients} onClientsRefresh={async()=>{ const fresh = await api.clients(); setClients(fresh); }}/>}
          {route==='promos'    && <PromosScreen promos={promos} products={products}/>}
          {route==='stock'     && <StockScreen products={products}/>}
          {route==='collect'   && <CollectScreen clients={clients}/>}
          {route==='kpi'       && <KpiScreen clients={clients} products={products}/>}
          {route==='admin'     && <AdminScreen mode={mode}/>}
        </div>
      </div>

      <ClientPicker open={pickerOpen} onClose={()=>setPickerOpen(false)} clients={clients} current={client} onPick={setClient}/>
      <OrderDrawer open={orderOpen} onClose={()=>setOrderOpen(false)} cart={cart} updateCartQty={updateCartQty} client={client} onConfirm={onConfirm} tariffMult={tariffMult} tariff={tariff} editing={!!editingOrderId}/>
      <ProductModal product={productOpen} onClose={()=>setProductOpen(null)} cart={cart} updateCartQty={updateCartQty} tariff={tariff} tariffMult={tariffMult} showStock={salesman.role==='admin'}/>
      <OrderDetailModal order={orderDetailOpen} onClose={()=>setOrderDetailOpen(null)}/>
    </div>
  );
}
