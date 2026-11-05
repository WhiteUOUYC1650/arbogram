'use client';

/** Максимальный размер data-URL, который безопасно класть в документ Firestore (лимит 1 МБ). */
export const MAX_INLINE_MEDIA_LENGTH = 780_000;

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Сжимает изображение, сохраняя пропорции, и возвращает JPEG data-URL. */
export function compressImage(
  file: File,
  { maxWidth = 1280, maxHeight = 1280, quality = 0.72 }: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    readFileAsDataUrl(file)
      .then((dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas недоступен'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      })
      .catch(reject);
  });
}

/** Длительность медиа в формате 0:07. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}
