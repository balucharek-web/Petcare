import { Capacitor, registerPlugin } from '@capacitor/core';
import { loginWithGooglePopup } from './firebaseAuth';

export interface NativeGoogleAuthPluginInterface {
  signIn(): Promise<{ email: string; name?: string; photoUrl?: string; idToken?: string; success: boolean }>;
  chooseAccount(): Promise<{ email: string; name?: string; photoUrl?: string; idToken?: string; success: boolean }>;
  signOut(): Promise<void>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPluginInterface>('NativeGoogleAuth');

export interface AuthenticatedGoogleUser {
  email: string;
  name: string;
  photoUrl?: string;
  idToken: string;
}

/**
 * Perform commercial-grade Google Sign-In:
 * - On Native Android (Capacitor): Invokes Google Sign-In SDK with server client ID to get a verified JWT idToken.
 * - On Web / Desktop / PWA / Fallback: Opens official Google popup with Firebase Auth to get verified JWT idToken.
 */
export async function performSecureGoogleSignIn(): Promise<AuthenticatedGoogleUser> {
  const isAndroidNative = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';

  if (isAndroidNative) {
    try {
      const res = await NativeGoogleAuth.signIn();
      if (res && res.email && res.idToken) {
        return {
          email: res.email.toLowerCase(),
          name: res.name || res.email.split('@')[0],
          photoUrl: res.photoUrl,
          idToken: res.idToken,
        };
      }
    } catch (androidErr: any) {
      console.warn('Native Android Google Sign-In exception, falling back to Web OAuth Popup:', androidErr);
      // Fallback gracefully to Firebase Web OAuth popup if native Play Services is unavailable
    }
  }

  // Web / PWA / Browser or Android fallback
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
