import { Capacitor, registerPlugin } from '@capacitor/core';
import { loginWithGooglePopup } from './firebaseAuth';

export interface AndroidProof {
  deviceId: string;
  timestamp: number;
  signature: string;
}

export interface NativeGoogleAuthPluginInterface {
  signIn(): Promise<{
    email: string;
    name?: string;
    photoUrl?: string;
    idToken?: string;
    platform?: string;
    deviceId?: string;
    timestamp?: number;
    signature?: string;
    success: boolean;
  }>;
  chooseAccount(): Promise<any>;
  signOut(): Promise<void>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPluginInterface>('NativeGoogleAuth');

export interface AuthenticatedGoogleUser {
  email: string;
  name: string;
  photoUrl?: string;
  idToken?: string;
  androidProof?: AndroidProof;
}

/**
 * Perform reliable & secure Google Sign-In:
 * - On Native Android (Capacitor APK): Invokes the native Android OS Google Account Picker.
 *   Generates hardware-bound HMAC device proof so requests cannot be spoofed.
 *   NEVER falls back to web popup inside Android WebView, avoiding Chrome crashes or unauthorized-domain errors.
 * - On Web / Desktop / PWA (Browser): Opens official Google popup with verified JWT idToken.
 */
export async function performSecureGoogleSignIn(): Promise<AuthenticatedGoogleUser> {
  const isAndroidNative = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';

  if (isAndroidNative) {
    try {
      const res = await NativeGoogleAuth.signIn();
      if (res && res.email) {
        const cleanEmail = res.email.trim().toLowerCase();
        return {
          email: cleanEmail,
          name: res.name || cleanEmail.split('@')[0],
          photoUrl: res.photoUrl || '',
          idToken: res.idToken || '',
          androidProof: res.signature && res.deviceId && res.timestamp ? {
            deviceId: res.deviceId,
            timestamp: res.timestamp,
            signature: res.signature,
          } : undefined,
        };
      }
      throw new Error('Nie wybrano konta Google.');
    } catch (androidErr: any) {
      const msg = androidErr?.message || String(androidErr);
      if (msg.includes('Anulowano') || msg.includes('cancel') || msg.includes('przerwane')) {
        throw new Error('Logowanie kontem Google zostało przerwane.');
      }
      throw new Error(msg || 'Nie udało się wybrać konta Google w telefonie.');
    }
  }

  // Web / PWA / Desktop browser
  const webUser = await loginWithGooglePopup();
  return {
    email: webUser.email.toLowerCase(),
    name: webUser.name,
    photoUrl: webUser.photoUrl,
    idToken: webUser.idToken,
  };
}

/**
 * Backward-compatible alias
 */
export async function promptAndroidNativeGoogleSignIn(): Promise<AuthenticatedGoogleUser> {
  return performSecureGoogleSignIn();
}
