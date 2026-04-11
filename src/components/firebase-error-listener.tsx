
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Выводим ошибку в консоль, чтобы пользователь мог кликнуть по ссылке для создания индекса
      console.error("[Arbogram Firestore Error]:", error);
      if (error.context) {
        console.error("Context:", error.context);
      }

      toast({
        variant: 'destructive',
        title: 'Ошибка базы данных',
        description: `Действие отклонено. Если требуется индекс, ссылка выведена в консоль (F12).`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
