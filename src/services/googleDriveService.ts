import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
// Force prompt to ensure consent / account selection
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory (never in localStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged into Firebase Auth on load, we can request token or wait for user sign-in
        if (onAuthSuccess && cachedAccessToken) {
          onAuthSuccess(user, cachedAccessToken);
        } else if (onAuthFailure) {
          onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Nie udało się uzyskać tokenu dostępu do Dysku Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

// ==========================================
// Google Drive API REST Helpers (v3)
// ==========================================

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

const DRIVE_FILE_NAME = 'petcare_sync_data.json';

/**
 * Searches for existing petcare data file in user's Google Drive
 */
export async function findDriveSyncFile(token: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Błąd wyszukiwania pliku w Google Drive:', errorText);
    throw new Error(`Google Drive API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0] as DriveFileInfo;
  }
  return null;
}

/**
 * Downloads pet data JSON from Google Drive
 */
export async function downloadPetDataFromDrive(token: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Błąd pobierania danych z Google Drive:', errorText);
    throw new Error(`Nie udało się pobrać pliku z Dysku Google (${response.status})`);
  }

  return await response.text();
}

/**
 * Uploads (create or overwrite) pet data JSON into user's Google Drive.
 * Note: Must be preceded by explicit user confirmation modal.
 */
export async function uploadPetDataToDrive(token: string, jsonData: string, existingFileId?: string): Promise<DriveFileInfo> {
  if (existingFileId) {
    // Update existing file content
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const response = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: jsonData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Błąd aktualizacji pliku w Google Drive:', errorText);
      throw new Error(`Błąd zapisu w Google Drive (${response.status})`);
    }

    const updated = await response.json();
    return {
      id: updated.id || existingFileId,
      name: DRIVE_FILE_NAME,
      modifiedTime: new Date().toISOString()
    };
  } else {
    // 1. Create file metadata in Drive
    const metaResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: DRIVE_FILE_NAME,
        mimeType: 'application/json',
        description: 'PetCare - Kopia zapasowa i synchronizacja danych Twojego zwierzaka'
      })
    });

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error('Błąd tworzenia pliku w Google Drive:', errorText);
      throw new Error(`Błąd tworzenia pliku w Google Drive (${metaResponse.status})`);
    }

    const createdMeta = await metaResponse.json();
    const newFileId = createdMeta.id;

    // 2. Upload actual JSON content into the created file
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: jsonData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Błąd wgrywania zawartości pliku w Google Drive:', errorText);
      throw new Error(`Błąd wgrywania danych (${uploadResponse.status})`);
    }

    return {
      id: newFileId,
      name: DRIVE_FILE_NAME,
      modifiedTime: new Date().toISOString()
    };
  }
}
