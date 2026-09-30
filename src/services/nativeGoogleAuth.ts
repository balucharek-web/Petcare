import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeGoogleAuthPluginInterface {
  signIn(): Promise<{ email: string; name?: string; photoUrl?: string; idToken?: string; success: boolean }>;
  chooseAccount(): Promise<{ email: string; name?: string; photoUrl?: string; success: boolean }>;
}

export const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPluginInterface>('NativeGoogleAuth');

export async function promptAndroidNativeGoogleSignIn(): Promise<{ email: string; name?: string; photoUrl?: string }> {
  // Check if running on Android native app
  const isAndroidNative = Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android';

  if (isAndroidNative) {
    // Wywołanie wyłącznie jednego systemowego okna Google (Screenshot 1)
    const res = await NativeGoogleAuth.signIn();
    if (res && res.email) {
      return {
        email: res.email,
        name: res.name || res.email.split('@')[0],
        photoUrl: res.photoUrl,
      };
    }
    throw new Error('Nie wybrano konta Google.');
  }

  // Running on Web preview (not native Android)
  throw new Error('WEB_PREVIEW');
}
