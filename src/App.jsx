import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginScreen } from './screens/LoginScreen';
import { Dashboard } from './screens/Dashboard';
import { Catalog } from './screens/Catalog';
import { ClientPicker } from './screens/ClientPicker';
import { OrderDrawer } from './screens/OrderDrawer';
import { ProductModal } from './screens/ProductModal';
import { OrdersScreen, ClientsScreen, TariffsScreen, PromosScreen, StockScreen, CollectScreen, KpiScreen, AdminScreen } from './screens/OtherScreens';
import { api } from './api';

const SALESMAN = { name: 'Ana Ribera', firstName: 'Ana', initials: 'AR', zone: 'Levante · 42 clientes', email: 'aribera@vendly.com' };

// Multiplicadores por tarifa — derivados del campo `mult` que llega del backend.
function buildTariffMult(tariffs) {
  const map = {};
  for (const t of tariffs) map[t.id] = t.mult ?? 1;
  return map;
}

export default function App() {
  const [density] = useState('regular');
  const [view] = useState('grid');
  const [cardSize] = useState(210);

  const [logged, setLogged] = useState(true);
  const [route, setRoute] = useState('dashboard');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [cart, setCart] = useState({});

  // ── Datos remotos ───────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [clients, setClients]   = useState([]);
  const [tariffs, setTariffs]   = useState([]);
  const [promos, setPromos]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [client, setClient]     = useState(null);
  const [mode, setMode]         = useState('…');
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [h, prods, cls, tfs, prs, ords] = await Promise.all([
          api.health(), api.products(), api.clients(), api.tariffs(), api.promos(), api.orders(),
        ]);
        if (cancel) return;
        setMode(h.mode);
        setProducts(prods);
        setClients(cls);
        setTariffs(tfs);
        setPromos(prs);
        setOrders(ords);
        setClient(cls[0] || null);
        // Carrito de demo cuando hay productos
        if (prods.length >= 12) setCart({ [prods[0].id]: 6, [prods[3].id]: 24, [prods[11].id]: 4 });
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const tariffMult = useMemo(() => buildTariffMult(tariffs), [tariffs]);
  const tariff = client?.tariff || 'T2';
  const lines = Object.entries(cart).filter(([,n])=>n>0);
  const orderTotal = lines.reduce((a,[id,n])=>{
    const p = products.find(x=>x.id===id);
    return a + (p ? p.pvp * (tariffMult[tariff]||1) * n : 0);
  }, 0) * 1.21;

  const titles = {
    dashboard:'Inicio', catalog:'Catálogo', orders:'Pedidos', clients:'Clientes',
    tariffs:'Tarifas', promos:'Promociones', stock:'Stock', collect:'Cobros',
    kpi:'Mi rendimiento', admin:'Administración'
  };

  const onConfirm = async () => {
    try {
      await api.createOrder({
        partnerId: client.odooId || null,
        pricelistId: tariffs.find(t=>t.id===tariff)?.odooId || null,
        lines: lines.map(([id,qty]) => ({ productId: products.find(p=>p.id===id)?.odooId, qty })),
      });
      // Refrescamos lista de pedidos
      const fresh = await api.orders();
      setOrders(fresh);
    } catch (e) {
      // En mock fallamos suave: añadimos uno local para feedback visual
      const id = 'PD-' + Math.floor(Math.random()*9000+1000);
      setOrders([{ id, client: client.id, date:'2026-04-29', total: orderTotal, lines: lines.length, status:'borrador' }, ...orders]);
    }
    setCart({});
    setOrderOpen(false);
    setRoute('orders');
  };

  if (!logged) return <LoginScreen onLogin={()=>setLogged(true)}/>;

  if (error) return (
    <div style={{ padding: 40, fontFamily:'var(--font-sans)' }}>
      <div className="t-h1" style={{ marginBottom: 8 }}>Error cargando la API</div>
      <div className="t-small" style={{ color:'var(--danger)' }}>{error}</div>
    </div>
  );

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} salesman={SALESMAN} orderCount={orders.filter(o=>o.status==='borrador').length}/>
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
        />
        <div className="app-content">
          {route==='dashboard' && <Dashboard setRoute={setRoute} salesman={SALESMAN} client={client} recentOrders={orders} clients={clients} promos={promos} products={products}/>}
          {route==='catalog'   && <Catalog view={view} cart={cart} setCart={setCart} client={client} openProduct={setProductOpen} cardSize={cardSize} density={density} products={products} tariffMult={tariffMult}/>}
          {route==='orders'    && <OrdersScreen orders={orders} clients={clients}/>}
          {route==='clients'   && <ClientsScreen clients={clients} onPick={c=>{setClient(c); setRoute('catalog');}}/>}
          {route==='tariffs'   && <TariffsScreen tariffs={tariffs} products={products}/>}
          {route==='promos'    && <PromosScreen promos={promos} products={products}/>}
          {route==='stock'     && <StockScreen products={products}/>}
          {route==='collect'   && <CollectScreen clients={clients}/>}
          {route==='kpi'       && <KpiScreen clients={clients} products={products}/>}
          {route==='admin'     && <AdminScreen mode={mode}/>}
        </div>
      </div>

      <ClientPicker open={pickerOpen} onClose={()=>setPickerOpen(false)} clients={clients} current={client} onPick={setClient}/>
      <OrderDrawer open={orderOpen} onClose={()=>setOrderOpen(false)} cart={cart} setCart={setCart} client={client} onConfirm={onConfirm} products={products} tariffMult={tariffMult}/>
      <ProductModal product={productOpen} onClose={()=>setProductOpen(null)} qty={cart[productOpen?.id]||0} setQty={n=>setCart({...cart,[productOpen.id]:n})} tariff={tariff} tariffMult={tariffMult}/>
    </div>
  );
}
