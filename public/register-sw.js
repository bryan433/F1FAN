/* Web-only enhancement. A registration failure must not block F1Fan. */
(() => {
  if (!window.isSecureContext || !('serviceWorker' in navigator)
      || !document.querySelector('script[src^="/_expo/static/js/"]')) return;
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/', updateViaCache: 'none',
      });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && registration.active) {
            console.info('[F1Fan PWA] Nueva versión preparada. Cierra todas las ventanas de F1Fan para activarla.');
          }
        });
      });
      await navigator.serviceWorker.ready;
      console.info('[F1Fan PWA] Service worker activo; copia estática preparada. Los datos de las API requieren su conexión o caché existente.');
    } catch (error) {
      console.warn('[F1Fan PWA] No se pudo preparar la apertura offline. La aplicación online continúa.', error);
    }
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
