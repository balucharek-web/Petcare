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
import { tryGisOAuthToken } from './gisAuth';

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
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      console.warn('Firebase auth/unauthorized-domain w googleDriveService. Próba GIS...');
      try {
        const gisResult = await tryGisOAuthToken();
        if (gisResult && gisResult.accessToken) {
          cachedAccessToken = gisResult.accessToken;
          const mockUser: any = {
            email: gisResult.email,
            displayName: gisResult.name,
            photoURL: gisResult.photoUrl,
            uid: 'gis_' + gisResult.email,
          };
          return { user: mockUser, accessToken: gisResult.accessToken };
        }
      } catch (gisErr) {
        console.warn('GIS fallback w googleDriveService nie powiódł się:', gisErr);
      }
    }

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

export const DRIVE_BACKUP_FOLDER_NAME = 'petcare_kopiazapasowa';
const DRIVE_FILE_NAME = 'petcare_app_data.json';

/**
 * Finds or creates the dedicated 'petcare_kopiazapasowa' folder
 */
export async function getOrCreateDriveBackupFolder(token: string): Promise<string | null> {
  try {
    // 1. Search existing folder
    const q = "mimeType = 'application/vnd.google-apps.folder' and (name = 'petcare_kopiazapasowa' or name = 'petcare_kopiazaoasowa') and trashed = false";
    const searchUrl = `https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Create if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: DRIVE_BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Folder kopii zapasowych aplikacji PetCare'
      })
    });
    if (createRes.ok) {
      const folder = await createRes.json();
      return folder.id;
    }
  } catch (err) {
    console.warn('[Google Drive Service] Błąd operacji na folderze:', err);
  }
  return null;
}

/**
 * Searches for existing petcare data file in user's Google Drive (in folder first, then global)
 */
export async function findDriveSyncFile(token: string): Promise<DriveFileInfo | null> {
  try {
    // 1. Check folder first
    const qFolder = "mimeType = 'application/vnd.google-apps.folder' and (name = 'petcare_kopiazapasowa' or name = 'petcare_kopiazaoasowa') and trashed = false";
    const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=drive&q=${encodeURIComponent(qFolder)}&fields=files(id)&pageSize=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    if (folderRes.ok) {
      const folderData = await folderRes.json();
      if (folderData.files && folderData.files.length > 0) {
        const folderId = folderData.files[0].id;
        const fileInFolderQ = encodeURIComponent(`'${folderId}' in parents and (name = 'petcare_app_data.json' or name = 'petcare_sync_data.json') and trashed = false`);
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${fileInFolderQ}&fields=files(id,name,modifiedTime,size)&spaces=drive&orderBy=modifiedTime desc`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        if (fileRes.ok) {
          const filesData = await fileRes.json();
          if (filesData.files && filesData.files.length > 0) {
            return filesData.files[0] as DriveFileInfo;
          }
        }
      }
    }
  } catch {}

  // 2. Global fallback
  const query = encodeURIComponent("(name = 'petcare_app_data.json' or name = 'petcare_sync_data.json') and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive&orderBy=modifiedTime desc`;
  
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
 * Places file inside 'petcare_kopiazapasowa' folder.
 */
export async function uploadPetDataToDrive(token: string, jsonData: string, existingFileId?: string): Promise<DriveFileInfo> {
  const folderId = await getOrCreateDriveBackupFolder(token);

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

    if (folderId) {
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${existingFileId}?addParents=${folderId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }

    const updated = await response.json();
    return {
      id: updated.id || existingFileId,
      name: DRIVE_FILE_NAME,
      modifiedTime: new Date().toISOString()
    };
  } else {
    // 1. Create file metadata in Drive inside folder
    const metaBody: any = {
      name: DRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'PetCare - Kopia zapasowa i synchronizacja danych Twojego zwierzaka'
    };
    if (folderId) {
      metaBody.parents = [folderId];
    }

    const metaResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaBody)
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
