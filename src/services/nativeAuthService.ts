// Native Android Credential & Biometric Verification Service for PetCare
// Supports Android Credential Manager, WebAuthn (Fingerprint/Face/Screen Lock), and Google One-Tap

export interface NativeAccountInfo {
  email: string;
  name: string;
  avatar?: string;
  lastUsed?: string;
}

// Check if Android Native Biometric / Screen Lock is available
export async function isNativeBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    }
  } catch (err) {
    console.warn('[NativeAuth] Biometrics check error:', err);
  }
  return false;
}

// Trigger Native Android System Dialog: "Potwierdź tożsamość (odcisk palca / kod blokady ekranu)"
export async function requestNativeAndroidVerification(accountEmail: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      return true; // Fallback if device doesn't support WebAuthn
    }

    const challenge = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(challenge);
    } else {
      for (let i = 0; i < 32; i++) challenge[i] = Math.floor(Math.random() * 256);
    }

    const userId = new TextEncoder().encode(accountEmail.toLowerCase().trim());

    // Request native Android screen lock or biometric verification
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'PetCare - Bezpieczna Książeczka Pupila',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: userId,
          name: accountEmail,
          displayName: accountEmail.split('@')[0],
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Native phone authenticator (Fingerprint/PIN)
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    return !!credential;
  } catch (err: any) {
    // If user cancelled the fingerprint dialog
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
      console.warn('[NativeAuth] Użytkownik anulował weryfikację biometryczną Androida.');
      throw new Error('Anulowano weryfikację tożsamości na telefonie.');
    }
    console.warn('[NativeAuth] Błąd natywnego dialogu Androida:', err);
    // Return true if system lacks hardware authenticator so user is not permanently locked out
    return true;
  }
}

// Decode Google JWT Token from Google Identity Services
export function parseGoogleJwt(token: string): { email: string; name: string; picture: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      email: parsed.email || '',
      name: parsed.name || parsed.given_name || parsed.email?.split('@')[0] || '',
      picture: parsed.picture || '',
    };
  } catch (err) {
    console.warn('[NativeAuth] Nie udało się odkodować tokenu Google JWT:', err);
    return null;
  }
}

// Mount Google One-Tap native account prompt if available
export function initGoogleOneTap(
  clientId: string,
  onAccountSelected: (account: { email: string; name: string; avatar: string }) => void
): boolean {
  if (typeof window === 'undefined') return false;
  const google = (window as any).google;
  if (!google || !google.accounts || !google.accounts.id) return false;

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response && response.credential) {
          const profile = parseGoogleJwt(response.credential);
          if (profile && profile.email) {
            onAccountSelected({
              email: profile.email,
              name: profile.name,
              avatar: profile.picture,
            });
          }
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed()) {
        console.log('[NativeAuth] Google One Tap nie został wyświetlony:', notification.getNotDisplayedReason());
      } else if (notification.isSkippedMoment()) {
        console.log('[NativeAuth] Google One Tap pominięty:', notification.getSkippedReason());
      }
    });

    return true;
  } catch (err) {
    console.warn('[NativeAuth] Błąd inicjalizacji Google One Tap:', err);
    return false;
  }
}
