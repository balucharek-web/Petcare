import { registerPlugin, Capacitor } from '@capacitor/core';

export interface NativeWidgetPluginType {
  updateWidgetData(options: any): Promise<{ success: boolean }>;
  isPinningSupported(): Promise<{ supported: boolean }>;
  pinWidget(): Promise<{ requested: boolean; fallbackGuideRequired?: boolean }>;
  isBatteryOptimizationIgnored(): Promise<{ isIgnored: boolean; manufacturer: string }>;
  requestIgnoreBatteryOptimization(): Promise<{ success: boolean }>;
  openAppSystemSettings(): Promise<{ success: boolean }>;
}

export const NativeWidgetPlugin = registerPlugin<NativeWidgetPluginType>('NativeWidgetPlugin');

export interface BatteryStatus {
  isSupported: boolean;
  isIgnored: boolean;
  manufacturer: string;
}

export async function checkBatteryOptimizationStatus(): Promise<BatteryStatus> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return {
      isSupported: false,
      isIgnored: true,
      manufacturer: 'browser',
    };
  }

  try {
    const res = await NativeWidgetPlugin.isBatteryOptimizationIgnored();
    return {
      isSupported: true,
      isIgnored: res.isIgnored,
      manufacturer: res.manufacturer || 'Android',
    };
  } catch (e) {
    console.warn('Błąd sprawdzania optymalizacji baterii:', e);
    return {
      isSupported: false,
      isIgnored: true,
      manufacturer: 'unknown',
    };
  }
}

export async function requestIgnoreBatteryOptimization(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await NativeWidgetPlugin.requestIgnoreBatteryOptimization();
    return res.success;
  } catch (e) {
    console.warn('Błąd wywołania prośby o ignorowanie optymalizacji baterii:', e);
    return false;
  }
}

export async function openAppSystemSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await NativeWidgetPlugin.openAppSystemSettings();
    return res.success;
  } catch (e) {
    console.warn('Błąd otwierania ustawień systemowych aplikacji:', e);
    return false;
  }
}
