import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Auto-refresca la PWA cuando hay un nuevo deploy disponible. La opción
// `immediate` recarga la página sin pedir confirmación al comercial; lo que
// queremos en una app interna donde cada deploy debe llegar al iPad sin
// pasos manuales. Junto a skipWaiting+clientsClaim del SW, garantiza que
// los próximos deploys se aplican en cuestión de segundos.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateSW(true); },
  onRegisteredSW(swUrl, registration) {
    // Polling cada 60s por si el comercial deja la PWA abierta horas.
    if (registration) setInterval(() => registration.update().catch(() => {}), 60_000);
  },
})
