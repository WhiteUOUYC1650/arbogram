'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Слушатель ошибок Firebase.
 * Теперь выводит ошибки ТОЛЬКО в консоль по просьбе пользователя.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Выводим детальную информацию в консоль (F12)
      console.group("%c[CoveChat Firestore Error]", "color: #ef4444; font-weight: bold;");
      console.error("Message:", error.message);
      console.error("Path:", error.context?.path);
      console.error("Operation:", error.context?.operation);
      if (error.context?.requestResourceData) {
        console.error("Data:", error.context.requestResourceData);
      }
      // Если это ошибка индекса, в оригинальной ошибке будет ссылка
      if ((error as any).originalError) {
        console.warn("Original Error (check for index URL):", (error as any).originalError);
      }
      console.groupEnd();
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null;
}