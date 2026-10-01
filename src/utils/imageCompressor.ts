/**
 * Utility for client-side image compression and resizing.
 * Converts heavy multi-megapixel smartphone camera photos (10-25 MB)
 * to crisp, lightweight WebP/JPEG images (~150-300 KB) suitable for
 * localStorage and fast cloud synchronization.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
  compressionRatio: number; // e.g. 0.15 (85% saved)
}

export async function compressImage(
  fileOrDataUrl: File | Blob | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    format = 'image/webp',
  } = options;

  let originalSize = 0;
  let dataUrlSrc = '';

  if (typeof fileOrDataUrl === 'string') {
    dataUrlSrc = fileOrDataUrl;
    originalSize = Math.round((dataUrlSrc.length * 3) / 4);
  } else {
    originalSize = fileOrDataUrl.size;
    dataUrlSrc = await readFileAsDataURL(fileOrDataUrl);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate aspect ratio preserving bounds
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // Draw onto canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original
        resolve({
          dataUrl: dataUrlSrc,
          originalSize,
          compressedSize: originalSize,
          width,
          height,
          format: 'image/jpeg',
          compressionRatio: 1,
        });
        return;
      }

      // Use better smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt webp first, fallback to jpeg if unsupported
      let targetFormat = format;
      let compressedDataUrl = canvas.toDataURL(targetFormat, quality);

      if (!compressedDataUrl.startsWith(`data:${targetFormat}`)) {
        targetFormat = 'image/jpeg';
        compressedDataUrl = canvas.toDataURL(targetFormat, quality);
      }

      const compressedSize = Math.round((compressedDataUrl.length * 3) / 4);
      const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

      resolve({
        dataUrl: compressedDataUrl,
        originalSize,
        compressedSize,
        width,
        height,
        format: targetFormat,
        compressionRatio,
      });
    };

    img.onerror = (err) => {
      reject(new Error('Nie udało się załadować zdjęcia do kompresji: ' + err));
    };

    img.src = dataUrlSrc;
  });
}

function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human-readable string (e.g. 1.2 MB or 340 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
