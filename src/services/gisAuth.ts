import firebaseConfig from '../../firebase-applet-config.json';

export interface GisAuthResult {
  email: string;
  name: string;
  photoUrl: string;
  accessToken: string;
  idToken: string;
}

/**
 * Attempts to request an OAuth2 access token with Google Drive scopes using Google Identity Services (GIS).
 * This works directly via Google OAuth 2.0 Token Client without Firebase Auth domain restrictions.
 */
export async function tryGisOAuthToken(): Promise<GisAuthResult | null> {
  if (typeof window === 'undefined') return null;

  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) return null;

  // If GIS script hasn't loaded yet, give it a moment
  if (!window.google?.accounts?.oauth2) {
    await new Promise((r) => setTimeout(r, 600));
  }

  if (!window.google?.accounts?.oauth2) return null;

  return new Promise((resolve) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
        callback: async (tokenResp: any) => {
          if (tokenResp.error || !tokenResp.access_token) {
            console.warn('GIS token callback response notice:', tokenResp.error || 'Brak tokenu');
            return resolve(null);
          }

          try {
            const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResp.access_token}` },
            });
            if (uRes.ok) {
              const uData = await uRes.json();
              if (uData.email) {
                return resolve({
                  email: uData.email.toLowerCase(),
                  name: uData.name || uData.email.split('@')[0],
                  photoUrl: uData.picture || '',
                  accessToken: tokenResp.access_token,
                  idToken: '',
                });
              }
            }
          } catch (e) {
            console.warn('Błąd pobierania danych użytkownika GIS:', e);
          }
          resolve(null);
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      console.warn('Inicjalizacja klienta GIS nie powiodła się:', err);
      resolve(null);
    }
  });
}
