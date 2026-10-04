// Capture beforeinstallprompt immediately on page load
window.deferredPWAInstallPrompt = null;
try {
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    window.deferredPWAInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready', { detail: e }));
    console.log('PWA installation prompt captured and ready');
  });
} catch (err) {}

// Register Service Worker for offline PWA capabilities
try {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
  }
} catch (err) {}
