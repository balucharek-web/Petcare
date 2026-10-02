import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { tryGisOAuthToken } from './gisAuth';

// Initialize single shared Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.appdata');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleAuthResult {
  email: string;
  name: string;
  photoUrl: string;
  idToken: string;
  accessToken?: string;
  isFallback?: boolean;
}

/**
 * Standard commercial Google OAuth 2.0 / OpenID Connect Sign-In via Firebase Auth.
 * Opens genuine Google consent dialog with Drive scope permissions, cryptographically
 * verifies identity, and extracts both the Google ID Token (JWT) and OAuth 2.0 accessToken.
 * If Firebase rejects the current origin (auth/unauthorized-domain in dev/preview),
 * seamlessly falls back to Google Identity Services (GIS).
 */
export async function loginWithGooglePopup(): Promise<GoogleAuthResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Obtain fresh cryptographically signed ID Token (JWT) from Google / Firebase
    const idToken = await user.getIdToken(/* forceRefresh */ true);
    
    // Obtain Google OAuth 2.0 Access Token for Google Drive access
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    const email = user.email;

    if (!email) {
      throw new Error('Konto Google nie posiada zweryfikowanego adresu e-mail.');
    }

    return {
      email: email.toLowerCase(),
      name: user.displayName || email.split('@')[0],
      photoUrl: user.photoURL || '',
      idToken,
      accessToken: accessToken || undefined,
    };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    // If Firebase Auth blocks the domain (auth/unauthorized-domain)
    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      console.warn('Firebase auth/unauthorized-domain wykryty. Próba logowania przez Google Identity Services (GIS)...');
      try {
        const gisResult = await tryGisOAuthToken();
        if (gisResult) {
          return {
            email: gisResult.email,
            name: gisResult.name,
            photoUrl: gisResult.photoUrl,
            idToken: gisResult.idToken,
            accessToken: gisResult.accessToken,
          };
        }
      } catch (gisErr) {
        console.warn('GIS fallback check:', gisErr);
      }
    }

    throw error;
  }
}

/**
 * Sign out from Firebase Auth session
 */
export async function logoutFirebaseAuth(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Firebase sign-out warning:', err);
  }
}
