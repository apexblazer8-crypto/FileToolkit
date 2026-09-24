// PWA registration is production-only: Vite's development server remains untouched.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      // PWA installation is optional; failure must not affect conversion tools.
      console.warn('FileToolkit offline shell could not be enabled:', error);
    });
  });
}
