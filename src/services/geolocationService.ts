import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

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
 * Robust device location fetcher supporting:
 * 1. Capacitor Native Android (with native system runtime permission prompt)
 * 2. Web Browser & PWA (with navigator.geolocation)
 * 3. Graceful error reporting for disabled GPS or denied permission
 */
export async function requestDeviceLocation(): Promise<
  { success: true; coords: LocationCoordinates } | { success: false; error: LocationError }
> {
  // 1. Native Capacitor platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      let status = await Geolocation.checkPermissions();

      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        // Triggers Android OS native runtime permission modal
        status = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation'],
        });
      }

      if (status.location !== 'granted' && status.coarseLocation !== 'granted') {
        return {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Aplikacja nie ma uprawnień do lokalizacji w systemie telefonu.',
            isNative: true,
          },
        };
      }

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
      console.warn('Native Capacitor Geolocation error:', err);
      const errMsg = (err?.message || '').toLowerCase();
      const isOff =
        errMsg.includes('disabled') ||
        errMsg.includes('not enabled') ||
        errMsg.includes('provider') ||
        errMsg.includes('services are not enabled');

      return {
        success: false,
        error: {
          code: isOff ? 'LOCATION_DISABLED' : 'UNAVAILABLE',
          message: isOff
            ? 'Moduł lokalizacji (GPS) w telefonie jest wyłączony w menu skrótów.'
            : err?.message || 'Nie udało się uzyskać pozycji GPS.',
          isNative: true,
        },
      };
    }
  }

  // 2. Web Browser / PWA environment
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
    // Attempt high accuracy first
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
        let message = 'Lokalizacja w telefonie jest wyłączona lub zablokowana.';

        if (err.code === 1) {
          code = 'PERMISSION_DENIED';
          message = 'Brak zgody na dostęp do lokalizacji w przeglądarce lub telefonie.';
        } else if (err.code === 2) {
          code = 'LOCATION_DISABLED';
          message = 'Moduł GPS/Lokalizacja w urządzeniu jest wyłączony.';
        } else if (err.code === 3) {
          code = 'TIMEOUT';
          message = 'Przekroczono limit czasu oczekiwania na sygnał satelitów GPS.';
        }

        resolve({
          success: false,
          error: {
            code,
            message,
            isNative: false,
          },
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 0,
      }
    );
  });
}
