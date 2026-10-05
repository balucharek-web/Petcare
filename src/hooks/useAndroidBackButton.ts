import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const EXIT_CONFIRM_WINDOW_MS = 2000;
const MAX_TAB_HISTORY = 20;

function isVisible(el: HTMLElement): boolean {
  if (el.closest('[hidden]')) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function zIndexOf(el: HTMLElement): number {
  return Number.parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
}

/**
 * Closes the top-most open dialog by clicking its "Zamknij" button.
 * Returns true when a dialog was found (the back press is consumed).
 */
export function closeTopmostDialog(root: ParentNode = document): boolean {
  const dialogs = Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(isVisible);
  if (dialogs.length === 0) return false;
  const top = dialogs.reduce((best, el) => (zIndexOf(el) >= zIndexOf(best) ? el : best));
  const closeButton =
    top.querySelector<HTMLElement>('[aria-label="Zamknij"]') ||
    top.querySelector<HTMLElement>('[aria-label^="Zamknij"]');
  closeButton?.click();
  return true;
}

interface BackButtonOptions<T> {
  currentTab: T;
  homeTab: T;
  setCurrentTab: (tab: T) => void;
  onExitHint: () => void;
}

/**
 * Android hardware back button: close dialog → previous tab → home tab →
 * press twice to exit.
 */
export function useAndroidBackButton<T>({ currentTab, homeTab, setCurrentTab, onExitHint }: BackButtonOptions<T>) {
  const historyRef = useRef<T[]>([]);
  const previousTabRef = useRef(currentTab);
  const navigatingBackRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const latest = useRef({ currentTab, homeTab, setCurrentTab, onExitHint });
  latest.current = { currentTab, homeTab, setCurrentTab, onExitHint };

  useEffect(() => {
    if (previousTabRef.current === currentTab) return;
    if (!navigatingBackRef.current) {
      historyRef.current.push(previousTabRef.current);
      if (historyRef.current.length > MAX_TAB_HISTORY) historyRef.current.shift();
    }
    navigatingBackRef.current = false;
    previousTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const goToTab = (tab: T) => {
      navigatingBackRef.current = true;
      latest.current.setCurrentTab(tab);
    };

    const handle = CapacitorApp.addListener('backButton', () => {
      if (closeTopmostDialog()) return;

      const { currentTab: tab, homeTab: home } = latest.current;
      let previous = historyRef.current.pop();
      while (previous !== undefined && previous === tab) previous = historyRef.current.pop();
      if (previous !== undefined) {
        goToTab(previous);
        return;
      }
      if (tab !== home) {
        goToTab(home);
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < EXIT_CONFIRM_WINDOW_MS) {
        void CapacitorApp.exitApp();
        return;
      }
      lastBackPressRef.current = now;
      latest.current.onExitHint();
    });

    return () => {
      void handle.then((h) => h.remove());
    };
  }, []);
}
