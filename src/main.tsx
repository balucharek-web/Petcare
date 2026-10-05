import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { initStorage } from './services/storage';
import { initErrorReporting, reportError } from './services/errorReporting';

// Ensure dark status bar icons (clock, battery, signal) are clearly visible on light mode
try {
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.show().catch(() => {});
  }
} catch (e) {
  console.warn('StatusBar initialization skipped:', e);
}

initErrorReporting().catch(() => {});

const rootElement = document.getElementById('root');
if (rootElement) {
  initStorage().finally(() => {
    createRoot(rootElement, {
      onUncaughtError: (error) => {
        console.error('[PetCare] Uncaught render error:', error);
        reportError(error, { source: 'react-uncaught' });
      },
      onCaughtError: (error) => reportError(error, { source: 'react-caught' }),
    }).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
}

