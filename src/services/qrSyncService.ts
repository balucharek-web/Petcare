import QRCode from 'qrcode';
import { storage } from './storage';
import { getStoredSession } from './cloudSyncService';

export interface QRSyncResult {
  qrCodeDataUrl: string;
  qrId: string;
  expiresAt: number;
  petCount: number;
  scansCount: number;
}

function getApiUrl(endpoint: string): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    if (window.location.protocol.startsWith('http')) {
      return `${window.location.origin}${endpoint}`;
    }
  }
  return `https://ais-dev-3xzr2tfytwhikh6urd6fyx-472843422686.europe-west2.run.app${endpoint}`;
}

/**
 * Counts all media attachments across all pets, vaccines, and medical exams.
 */
export function countAllAttachments(): { petsWithPhotos: number; examScans: number; vaccineAttachments: number; total: number } {
  const pets = storage.getPets();
  const exams = storage.getExams();
  const vaccines = storage.getVaccinations();

  let petsWithPhotos = 0;
  pets.forEach(p => {
    if (p.photoUrl && p.photoUrl.length > 5) petsWithPhotos++;
  });

  let examScans = 0;
  exams.forEach(e => {
    if (Array.isArray(e.scans)) examScans += e.scans.length;
  });

  let vaccineAttachments = 0;
  vaccines.forEach(v => {
    if (Array.isArray(v.attachmentUrls)) vaccineAttachments += v.attachmentUrls.length;
  });

  return {
    petsWithPhotos,
    examScans,
    vaccineAttachments,
    total: petsWithPhotos + examScans + vaccineAttachments,
  };
}

/**
 * Exports 100% of local pet data including photos, medical scans, documents and full history,
 * uploads it to the transfer cache and generates a QR code to scan on the other device.
 */
export async function createDeviceSyncQRCode(): Promise<QRSyncResult> {
  const rawExport = storage.exportAllData();
  const payload = JSON.parse(rawExport);
  const session = getStoredSession();

  const response = await fetch(getApiUrl('/api/cloud-sync/generate-qr'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload,
      email: session.user?.email || 'local_user@petcare.app',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Błąd serwera (${response.status}) podczas tworzenia kodu QR.`);
  }

  const data = await response.json();
  const qrString = data.qrData || data.qrId;

  // Generate high-definition scannable QR code Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
    width: 380,
    margin: 2,
    color: {
      dark: '#0f172a', // Deep slate for instant camera contrast
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  const attachments = countAllAttachments();

  return {
    qrCodeDataUrl,
    qrId: data.qrId,
    expiresAt: data.expiresAt,
    petCount: data.petCount || payload.pets?.length || 0,
    scansCount: attachments.total,
  };
}

/**
 * Redeems a scanned QR string or code, downloads the full pet dossier and imports it into local storage.
 */
export async function redeemDeviceSyncQRCode(scannedText: string): Promise<{ petCount: number; attachmentsCount: number }> {
  let targetId = scannedText.trim();

  // Parse if JSON payload was encoded
  try {
    const parsed = JSON.parse(scannedText);
    if (parsed && parsed.id) {
      targetId = parsed.id;
    }
  } catch {
    // Plain string id
  }

  const response = await fetch(getApiUrl('/api/cloud-sync/redeem-qr'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrId: targetId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Nieprawidłowy kod QR lub kod wygasł. Wygeneruj nowy kod na pierwszym telefonie.');
  }

  const data = await response.json();
  if (!data.payload || !Array.isArray(data.payload.pets)) {
    throw new Error('Pobrane dane są niekompletne lub uszkodzone.');
  }

  // Import everything into local storage
  const success = storage.importAllData(JSON.stringify(data.payload));
  if (!success) {
    throw new Error('Wystąpił błąd podczas zapisywania danych w pamięci urządzenia.');
  }

  const attachments = countAllAttachments();

  return {
    petCount: data.payload.pets.length,
    attachmentsCount: attachments.total,
  };
}
