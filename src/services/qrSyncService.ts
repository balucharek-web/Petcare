import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { storage } from './storage';
import { getStoredSession } from './cloudSyncService';

export interface QRSyncResult {
  qrCodeDataUrl: string;
  qrId: string;
  expiresAt: number;
  petCount: number;
  scansCount: number;
}

export const PRIMARY_CLOUD_API = 'https://ais-dev-3xzr2tfytwhikh6urd6fyx-472843422686.europe-west2.run.app';
export const SECONDARY_CLOUD_API = 'https://ais-pre-3xzr2tfytwhikh6urd6fyx-472843422686.europe-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return PRIMARY_CLOUD_API;

  const origin = window.location.origin || '';
  const hostname = window.location.hostname || '';

  // In Capacitor Android, the origin is http://localhost or capacitor://localhost (local static assets)
  // We MUST route cloud sync calls to the live cloud backend
  if (
    Capacitor.isNativePlatform() ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    origin.startsWith('capacitor:') ||
    origin.startsWith('file:') ||
    !origin.includes('.run.app')
  ) {
    return PRIMARY_CLOUD_API;
  }

  return origin;
}

async function callCloudApi(endpoint: string, bodyObj: any): Promise<any> {
  const base = getApiBaseUrl();
  const candidates = [
    `${base}${endpoint}`,
    `${PRIMARY_CLOUD_API}${endpoint}`,
    `${SECONDARY_CLOUD_API}${endpoint}`,
  ];
  const uniqueUrls = Array.from(new Set(candidates));

  let lastError: Error | null = null;

  for (const url of uniqueUrls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(bodyObj),
        signal: AbortSignal.timeout(12000),
      });

      const contentType = response.headers.get('content-type') || '';
      // If we received HTML (e.g. from local Capacitor server), skip this URL
      if (!contentType.includes('application/json')) {
        continue;
      }

      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        return data;
      }

      if (data?.error) {
        lastError = new Error(data.error);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Błąd połączenia z serwerem synchronizacji.');
}

/**
 * Counts all media attachments across all pets, vaccines, and medical exams.
 */
export function countAllAttachments(): { petsWithPhotos: number; examScans: number; vaccineAttachments: number; total: number } {
  const pets = storage.getPets();
  const exams = storage.getExams();
  const vaccines = storage.getVaccinations();

  let petsWithPhotos = 0;
  pets.forEach((p) => {
    if (p.photoUrl && p.photoUrl.length > 5) petsWithPhotos++;
  });

  let examScans = 0;
  exams.forEach((e) => {
    if (Array.isArray(e.scans)) examScans += e.scans.length;
  });

  let vaccineAttachments = 0;
  vaccines.forEach((v) => {
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

  const data = await callCloudApi('/api/cloud-sync/generate-qr', {
    payload,
    email: session.user?.email || 'local_user@petcare.app',
  });

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

  const data = await callCloudApi('/api/cloud-sync/redeem-qr', {
    qrId: targetId,
  });

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
