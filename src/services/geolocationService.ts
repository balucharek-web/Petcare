import { registerPlugin, Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface NativeLocationPlugin {
  promptEnableLocation(): Promise<{ enabled: boolean }>;
  openLocationSettings(): Promise<{ opened: boolean }>;
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

/**
 * Robust device location fetcher:
 * - On Android APK: Invokes the DIRECT Android system prompt (Google Play Services ResolvableApiException)
 *   to turn on device GPS directly via OS dialog.
 * - On Web Browser / PWA: Uses native navigator.geolocation.
 * - Zero custom HTML modals.
 */
export async function requestDeviceLocation(): Promise<
  { success: true; coords: LocationCoordinates } | { success: false; error: LocationError }
> {
  // 1. Android / iOS Native Capacitor Platform
  if (Capacitor.isNativePlatform()) {
    try {
      // Step A: Request Android OS runtime permissions if needed
      let status = await Geolocation.checkPermissions();
      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        status = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation'],
        });
      }

      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Odmowa uprawnień do lokalizacji w systemie Android.',
            isNative: true,
          },
        };
      }

      // Step B: Trigger the DIRECT native Android OS dialog to turn on GPS if disabled
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
        console.warn('NativeLocation prompt error (falling back to direct getPosition):', nativeErr);
      }

      // Step C: Fetch coordinates using GPS
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
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
      return {
        success: false,
        error: {
          code: 'LOCATION_DISABLED',
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
