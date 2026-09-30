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

// Initialize single shared Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleAuthResult {
  email: string;
  name: string;
  photoUrl: string;
  idToken: string;
}

/**
 * Standard commercial Google OAuth 2.0 / OpenID Connect Sign-In via Firebase Auth.
 * Opens the genuine Google consent dialog, cryptographically verifies identity,
 * and extracts the Google ID Token (JWT).
 */
export async function loginWithGooglePopup(): Promise<GoogleAuthResult> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  // Obtain fresh cryptographically signed ID Token (JWT) from Google / Firebase
  const idToken = await user.getIdToken(/* forceRefresh */ true);
  const email = user.email;

  if (!email) {
    throw new Error('Konto Google nie posiada zweryfikowanego adresu e-mail.');
  }

  return {
    email: email.toLowerCase(),
    name: user.displayName || email.split('@')[0],
    photoUrl: user.photoURL || '',
    idToken,
  };
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
