import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Magic link de acceso (admin genera URL ?magic=<token> y la comparte). Lo
// procesamos aquí para que el comercial no vea siquiera la pantalla de login.
try {
  const params = new URLSearchParams(window.location.search);
  const magic = params.get('magic');
  if (magic) {
    sessionStorage.setItem('vendly_token', magic);
    // Limpiamos la URL para que el token no quede en historial / capturas.
    params.delete('magic');
    const rest = params.toString();
    const clean = window.location.pathname + (rest ? '?' + rest : '') + window.location.hash;
    history.replaceState(null, '', clean);
  }
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode><App/></StrictMode>
)

// Registro del Service Worker. Cargamos el virtual module dinámicamente y con
// try/catch para que un fallo aquí (vite-plugin-pwa no resuelto en algún
// entorno) NUNCA impida que la app se monte. Auto-refresca al detectar un
// nuevo deploy y polea cada 60s por si la PWA queda abierta horas.
;(async () => {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() { updateSW(true); },
      onRegisteredSW(_swUrl, registration) {
        if (registration) setInterval(() => registration.update().catch(() => {}), 60_000);
      },
    });
  } catch (e) {
    console.warn('[pwa] registro SW omitido:', e?.message || e);
  }
})()
