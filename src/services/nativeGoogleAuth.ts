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
    try {
      // 1. Trigger Google Play Services native system account chooser bottom sheet
      const res = await NativeGoogleAuth.signIn();
      if (res && res.email) {
        return {
          email: res.email,
          name: res.name || res.email.split('@')[0],
          photoUrl: res.photoUrl,
        };
      }
    } catch (err: any) {
      console.warn('[NativeGoogleAuth] signIn error, launching native AccountManager picker fallback:', err);
      // 2. Trigger native Android OS system AccountManager dialog
      const fallback = await NativeGoogleAuth.chooseAccount();
      if (fallback && fallback.email) {
        return {
          email: fallback.email,
          name: fallback.name || fallback.email.split('@')[0],
          photoUrl: fallback.photoUrl,
        };
      }
      throw err;
    }
  }

  // Running on Web preview (not native Android)
  throw new Error('WEB_PREVIEW');
}
