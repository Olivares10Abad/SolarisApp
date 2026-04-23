import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { Preferences } from '@capacitor/preferences'

// 1. Sincronizar Preferences Nativos a localStorage
async function initApp() {
  try {
    const { value } = await Preferences.get({ key: 'session_gea_solar' });
    if (value) {
      localStorage.setItem('session_gea_solar', value);
    }
  } catch (e) {
    console.warn("Preferences no disponible en este entorno", e);
  }

  // 2. Interceptar escrituras futuras para guardarlas nativamente
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, [key, value]);
    if (key === 'session_gea_solar') Preferences.set({ key, value }).catch(e => console.warn(e));
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, [key]);
    if (key === 'session_gea_solar') Preferences.remove({ key }).catch(e => console.warn(e));
  };

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

initApp();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registrado con éxito', reg))
      .catch(err => console.log('Error al registrar SW', err));
  });
}