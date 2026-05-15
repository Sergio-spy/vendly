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
import { OutboxModal } from './screens/OutboxModal';
import { OrdersScreen, ClientsScreen, TariffsScreen, PromosScreen, StockScreen, CollectScreen, KpiScreen, AdminScreen } from './screens/OtherScreens';
import { PromosAdmin } from './screens/PromosAdmin';
import { AdminKpi } from './screens/AdminKpi';
import { api, auth, setImageVersion } from './api';
import { cacheGet, cacheSet, outboxAdd, outboxCountPending, onOutboxChange } from './lib/db';
import { startAutoSync } from './lib/sync';
import { useOnline } from './lib/online';
import { prefetchProductImages } from './lib/prefetch';

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Detecta viewport mobile (≤768px) para forzar comportamiento de sidebar
  // como drawer y mostrar texto de items aunque desktop tenga collapsed=true.
  const [isMobile, setIsMobile] = useState(() => {
    try { return window.matchMedia('(max-width: 768px)').matches; } catch { return false; }
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  // En desktop el burger colapsa el sidebar a 68px. En móvil abre/cierra el
  // drawer overlay. Detectamos por viewport en el momento del click.
  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      setMobileNavOpen(v => !v);
      return;
    }
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('vendly_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };
  // Helper para envolver setRoute: en móvil, al elegir ruta cerramos el drawer.
  const goRoute = (r) => { setRoute(r); setMobileNavOpen(false); };

  const [salesman, setSalesman] = useState(null); // null = no logueado
  const [bootDone, setBootDone] = useState(false);

  const [route, setRoute] = useState('dashboard');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [cart, setCart] = useState({});
  const [pendingNewOrder, setPendingNewOrder] = useState(false);

  const [products, setProducts] = useState([]);
  const [clients, setClients]   = useState([]);
  const [tariffs, setTariffs]   = useState([]);
  const [promos, setPromos]     = useState([]);
  const [orders, setOrders]     = useState([]);
  const [families, setFamilies] = useState([]);
  const [comerciales, setComerciales] = useState([]);
  const [myGoal, setMyGoal]           = useState(null);
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
  // Estrategia: una sola llamada a /api/bootstrap (una Function, una auth a
  // Odoo). Si falla, reintenta con backoff hasta 3 veces antes de mostrar
  // pantalla de error. Esto cubre tanto cold-starts como rebotes puntuales
  // de Odoo SaaS.
  useEffect(() => {
    if (!salesman) return;
    let cancel = false;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    (async () => {
      const delays = [0, 800, 1800, 3500]; // 4 intentos: inmediato + 3 reintentos con backoff
      let lastErr = null;
      for (const d of delays) {
        if (d) await sleep(d);
        if (cancel) return;
        try {
          const data = await api.bootstrap();
          if (cancel) return;
          applyBootstrap(data);
          // Persistimos snapshot para arranque offline en futuras sesiones.
          cacheSet('bootstrap', data).catch(() => {});
          // Pre-cacheamos imágenes para que estén listas offline y la
          // navegación al catálogo sea instantánea.
          prefetchProductImages(data.products || []);
          if (salesman.role === 'admin') {
            api.comerciales().then(setComerciales).catch(() => setComerciales([]));
          }
          return; // OK
        } catch (e) {
          lastErr = e;
        }
      }
      // Si todos los reintentos fallaron, intentamos cargar el snapshot offline.
      if (!cancel) {
        const snap = await cacheGet('bootstrap').catch(() => null);
        if (snap) {
          applyBootstrap(snap);
          setError(null);
          return;
        }
        if (lastErr) setError(lastErr.message);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesman]);

  // Helper: aplica datos del bootstrap a los estados (reusable para snapshot).
  function applyBootstrap(data) {
    setMode(data.health?.mode || 'odoo');
    setHealth(data.health);
    setProducts(data.products || []);
    setClients(data.clients || []);
    setTariffs(data.tariffs || []);
    setPromos(data.promos || []);
    setOrders(data.orders || []);
    setFamilies(data.families || []);
    setMyGoal(data.myGoal || null);
    setImageVersion(data.imageVersion || '');
    // En modo portal cliente, auto-seleccionamos al partner del comercial:
    // siempre estamos pidiendo "como ese cliente". El selector de cliente no
    // se muestra y el catálogo se carga ya con su tarifa.
    if (salesman?.portalPartnerId) {
      const me = (data.clients || []).find(c => c.odooId === salesman.portalPartnerId) || null;
      setClient(me);
    } else {
      setClient(null);
    }
    setCart({});
  }

  // Arranca el sincronizador automático de outbox al montar la app.
  useEffect(() => {
    startAutoSync();
  }, []);

  // Cuenta de pedidos pendientes en la outbox (para el indicador del Topbar).
  const online = useOnline();
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [pendingOutbox, setPendingOutbox] = useState(0);
  useEffect(() => {
    let cancel = false;
    const refresh = async () => {
      try {
        const n = await outboxCountPending();
        if (!cancel) setPendingOutbox(n);
      } catch {}
    };
    refresh();
    const off = onOutboxChange(refresh);
    return () => { cancel = true; off(); };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  // En modo portal cliente la ruta dashboard no existe — redirigimos a catálogo.
  useEffect(() => {
    if (salesman?.portalPartnerId && (route === 'dashboard' || route === 'tariffs' || route === 'clients' || route === 'promos' || route === 'stock' || route === 'collect' || route === 'kpi' || route === 'admin' || route === 'admin-promos' || route === 'admin-kpi')) {
      setRoute('catalog');
    }
  }, [salesman?.portalPartnerId, route]);

  // Cuando cambia el cliente seleccionado, recargamos los productos para que
  // los precios reflejen la tarifa del cliente (property_product_pricelist).
  // Sin cliente → tarifa por defecto "Comercial PVP" del backend.
  // Saltamos la primera ejecución: bootstrap ya cargó productos con la default.
  useEffect(() => {
    if (!salesman || products.length === 0) return;
    let cancel = false;
    (async () => {
      try {
        const fresh = await api.products(client?.odooId);
        if (!cancel) setProducts(fresh);
      } catch { /* mantenemos los productos previos */ }
    })();
    return () => { cancel = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.odooId]);

  const tariffMult = useMemo(() => buildTariffMult(tariffs), [tariffs]);
  const tariff = client?.tariff || 'T2';
  // Cart entries: { [variantOdooId]: { qty, templateId, name, attrLabel?, price, sku, ean?, color?, glyph? } }
  const lines = Object.entries(cart).filter(([,e]) => e?.qty > 0);
  const orderTotal = lines.reduce((a,[,e]) => a + (e.price * (tariffMult[tariff]||1) * e.qty), 0) * 1.21;
  const orderUnits = lines.reduce((a,[,e]) => a + (e.qty || 0), 0);

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
    kpi:'Mi rendimiento', admin:'Administración', 'admin-promos':'Promociones (admin)', 'admin-kpi':'Análisis comerciales'
  };

  const onConfirm = async () => {
    if (!client?.odooId) {
      alert('Selecciona un cliente antes de confirmar el pedido.');
      return;
    }
    if (lines.length === 0) {
      alert('Añade al menos un producto al pedido.');
      return;
    }
    const payload = {
      partnerId: client.odooId,
      pricelistId: tariffs.find(t=>t.id===tariff)?.odooId || null,
      lines: lines.map(([variantId, e]) => ({ productId: Number(variantId), qty: e.qty })),
    };

    // Detector unificado de fallo de red (cubre Chrome, Safari, Firefox).
    const isNetworkError = (e) => {
      if (!e) return false;
      if (e.name === 'TypeError') return true; // fetch failed nativo
      const m = String(e.message || e).toLowerCase();
      return /failed to fetch|networkerror|network error|load failed|fetch failed|no internet|sin conex/.test(m);
    };

    // Atajo: si ya sabemos que estamos offline, ni intentamos. Encolamos directo.
    const skipNetwork = !online || (typeof navigator !== 'undefined' && navigator.onLine === false);

    let createOk = false;
    let createError = null;
    if (!skipNetwork) {
      try {
        if (editingOrderId) await api.updateOrder(editingOrderId, payload);
        else                await api.createOrder(payload);
        createOk = true;
      } catch (e) {
        createError = e;
      }
    }

    // Si la red falló (o estábamos offline desde el principio) → outbox.
    if (!createOk) {
      if (createError && !isNetworkError(createError)) {
        // Error de servidor (validación, 4xx, 5xx). No encolamos: se ha
        // recibido una respuesta clara del backend.
        alert('No se pudo guardar el pedido: ' + createError.message);
        return;
      }
      try {
        await outboxAdd({
          payload,
          mode: editingOrderId ? 'update' : 'create',
          orderId: editingOrderId || null,
        });
        alert('Sin conexión: pedido guardado localmente. Se subirá automáticamente cuando vuelva la conexión.');
      } catch (err) {
        alert('No se pudo guardar el pedido offline: ' + (err?.message || err));
        return;
      }
    } else {
      // Si subimos OK, refrescamos la lista de pedidos en background. Que
      // este refresh falle no afecta al éxito del pedido.
      api.orders().then(setOrders).catch(() => {});
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

  const isPortal = !!salesman?.portalPartnerId;

  return (
    <div className="app" data-collapsed={collapsed ? 'true' : 'false'} data-mobile-nav={mobileNavOpen ? 'open' : 'closed'} onClick={(e) => {
      // Si el drawer móvil está abierto y se hace click fuera del sidebar
      // (sobre el scrim, que está en el ::before del .app), cerrar.
      if (mobileNavOpen && e.target === e.currentTarget) setMobileNavOpen(false);
    }}>
      <Sidebar route={route} setRoute={goRoute} salesman={salesman} orderCount={orders.filter(o=>o.status==='borrador').length} onLogout={onLogout} collapsed={isMobile ? false : collapsed}/>
      <div className="app-main">
        <Topbar
          title={titles[route]}
          client={client}
          setClientPickerOpen={isPortal ? () => {} : setPickerOpen}
          online={online}
          lastSync={mode === 'odoo' ? 'Odoo · live' : 'modo mock'}
          orderTotal={orderTotal}
          orderLines={lines.length}
          orderUnits={orderUnits}
          onOpenOrder={()=>setOrderOpen(true)}
          onToggleSidebar={toggleSidebar}
          pendingOutbox={pendingOutbox}
          onOpenOutbox={()=>setOutboxOpen(true)}
          isPortal={isPortal}
        />
        <ApiKeyBanner health={health} isAdmin={salesman.role==='admin'}/>
        <div className="app-content">
          {route==='dashboard' && <Dashboard setRoute={setRoute} salesman={salesman} client={client} recentOrders={orders} clients={clients} promos={promos} products={products} myGoal={myGoal}/>}
          {route==='catalog'   && <Catalog view={view} cart={cart} updateCartQty={updateCartQty} client={client} openProduct={setProductOpen} cardSize={cardSize} density={density} products={products} tariffMult={tariffMult} families={families} showStock={salesman.role==='admin'} isPortal={isPortal}/>}
          {route==='orders'    && <OrdersScreen orders={orders} clients={clients} comerciales={comerciales}
            onNew={() => {
              if (!client?.odooId) { setPendingNewOrder(true); setPickerOpen(true); }
              else                  { setRoute('catalog'); }
            }}
            onRefresh={async()=>{ const fresh = await api.orders(); setOrders(fresh); }}
            onView={(o)=>setOrderDetailOpen(o)} onEdit={onEditOrder}
            isAdmin={salesman.role==='admin'} isPortal={isPortal}/>}
          {route==='clients'   && <ClientsScreen clients={clients} tariffs={tariffs} onPick={c=>{setClient(c); setRoute('catalog');}} onRefresh={async()=>{ const fresh = await api.clients(); setClients(fresh); }} isAdmin={salesman.role==='admin'}/>}
          {route==='tariffs'   && <TariffsScreen tariffs={tariffs} products={products} clients={clients}
            onClientsRefresh={async()=>{ const fresh = await api.clients(); setClients(fresh); }}
            onTariffsRefresh={async()=>{ const fresh = await api.tariffs(); setTariffs(fresh); }}
            isAdmin={salesman.role==='admin'}/>}
          {route==='promos'    && <PromosScreen promos={promos} products={products}/>}
          {route==='stock'     && <StockScreen products={products}/>}
          {route==='collect'   && <CollectScreen clients={clients} comerciales={comerciales} isAdmin={salesman.role==='admin'}/>}
          {route==='kpi'       && <KpiScreen clients={clients} products={products}/>}
          {route==='admin'     && <AdminScreen mode={mode} health={health} products={products} clients={clients} tariffs={tariffs} orders={orders} promos={promos} onRefresh={async()=>{
            const data = await api.bootstrap();
            setProducts(data.products || []); setClients(data.clients || []);
            setTariffs(data.tariffs || []); setPromos(data.promos || []);
            setOrders(data.orders || []); setFamilies(data.families || []);
            setHealth(data.health);
          }}/>}
          {route==='admin-promos' && <PromosAdmin onRefresh={async()=>{ const fresh = await api.promos(); setPromos(fresh); }}/>}
          {route==='admin-kpi'    && <AdminKpi/>}
        </div>
      </div>

      <ClientPicker open={pickerOpen} onClose={()=>{ setPickerOpen(false); setPendingNewOrder(false); }} clients={clients} current={client}
        onPick={(c) => {
          setClient(c);
          if (pendingNewOrder) { setPendingNewOrder(false); setRoute('catalog'); }
        }}/>
      <OrderDrawer open={orderOpen} onClose={()=>setOrderOpen(false)} cart={cart} updateCartQty={updateCartQty} client={client} onConfirm={onConfirm} onChangeClient={isPortal ? null : (()=>setPickerOpen(true))} tariffMult={tariffMult} tariff={tariff} editing={!!editingOrderId} isPortal={isPortal}/>
      <ProductModal product={productOpen} onClose={()=>setProductOpen(null)} cart={cart} updateCartQty={updateCartQty} tariff={tariff} tariffMult={tariffMult} showStock={salesman.role==='admin'} client={client} tariffName={client?.tariff || 'Comercial PVP'} isPortal={isPortal}/>
      <OrderDetailModal order={orderDetailOpen} onClose={()=>setOrderDetailOpen(null)} isPortal={isPortal}/>
      <OutboxModal open={outboxOpen} onClose={()=>setOutboxOpen(false)} clients={clients}/>
    </div>
  );
}
