import { registerPlugin, Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface NativeLocationPlugin {
  promptEnableLocation(): Promise<{ enabled: boolean }>;
  openLocationSettings(): Promise<{ opened: boolean }>;
  openAppSettings(): Promise<{ opened: boolean }>;
}

const NativeLocation = registerPlugin<NativeLocationPlugin>('NativeLocation');

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'LOCATION_DISABLED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'NOT_SUPPORTED';

export interface LocationError {
  code: LocationErrorCode;
  message: string;
  isNative: boolean;
}

export async function openNativeLocationSettings(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeLocation.openLocationSettings();
    } catch (e) {
      console.warn('openLocationSettings error:', e);
    }
  }
}

export async function openNativeAppSettings(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeLocation.openAppSettings();
    } catch (e) {
      console.warn('openAppSettings error:', e);
    }
  }
}

/**
 * Robust device location fetcher:
 * - On Android APK: Invokes the DIRECT Android system prompt (Google Play Services ResolvableApiException)
 *   to turn on device GPS directly via OS dialog, followed by Android runtime permissions and GPS reading.
 * - On Web Browser / PWA: Uses native navigator.geolocation.
 * - Zero custom HTML modals.
 */
export async function requestDeviceLocation(): Promise<
  { success: true; coords: LocationCoordinates } | { success: false; error: LocationError }
> {
  // 1. Android / iOS Native Capacitor Platform
  if (Capacitor.isNativePlatform()) {
    try {
      // Step 1: FIRST ensure device GPS / location services are turned on via native Android system dialog.
      // This triggers Google Play Services ResolvableApiException directly so Android displays
      // the official system prompt ("Włącz lokalizację w urządzeniu").
      try {
        const resolution = await NativeLocation.promptEnableLocation();
        if (!resolution.enabled) {
          return {
            success: false,
            error: {
              code: 'LOCATION_DISABLED',
              message: 'Lokalizacja w systemie Android nie została włączona.',
              isNative: true,
            },
          };
        }
      } catch (nativeErr) {
        console.warn('NativeLocation prompt error (falling back to permissions & position):', nativeErr);
      }

      // Step 2: SECOND check and request Android OS runtime permissions (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION).
      // Note: We safely wrap checkPermissions in try-catch so an error here never prevents
      // requestPermissions or getCurrentPosition.
      let hasPermission = false;
      try {
        const status = await Geolocation.checkPermissions();
        if (status.location === 'granted' || status.coarseLocation === 'granted') {
          hasPermission = true;
        }
      } catch (checkErr) {
        console.warn('Geolocation.checkPermissions warning:', checkErr);
      }

      if (!hasPermission) {
        try {
          const reqStatus = await Geolocation.requestPermissions({
            permissions: ['location', 'coarseLocation'],
          });
          if (reqStatus.location === 'granted' || reqStatus.coarseLocation === 'granted') {
            hasPermission = true;
          }
        } catch (reqErr) {
          console.warn('Geolocation.requestPermissions warning:', reqErr);
        }
      }

      // Step 3: Fetch exact GPS coordinates using high accuracy
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      return {
        success: true,
        coords: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
        },
      };
    } catch (err: any) {
      console.warn('Capacitor Geolocation error:', err);
      const errStr = (err?.message || '').toLowerCase();
      const isDenied = errStr.includes('denied') || errStr.includes('permission');
      return {
        success: false,
        error: {
          code: isDenied ? 'PERMISSION_DENIED' : 'LOCATION_DISABLED',
          message: err?.message || 'Nie udało się uzyskać pozycji GPS.',
          isNative: true,
        },
      };
    }
  }

  // 2. Web Browser / PWA Environment
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Twoja przeglądarka nie obsługuje lokalizacji GPS.',
        isNative: false,
      },
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          success: true,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
          },
        });
      },
      (err) => {
        console.warn('Navigator Geolocation error:', err);
        let code: LocationErrorCode = 'LOCATION_DISABLED';
        if (err.code === 1) code = 'PERMISSION_DENIED';
        else if (err.code === 3) code = 'TIMEOUT';

        resolve({
          success: false,
          error: {
            code,
            message: err.message,
            isNative: false,
          },
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
