
'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(queryRef: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryRef) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as T));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // КРИТИЧЕСКИ: Выводим ошибку в консоль. 
        // Если там есть ссылка "https://console.firebase.google.com/...", по ней НУЖНО перейти, чтобы создать индекс.
        console.error("Firestore Collection Error:", err);
        
        if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
          const permissionError = new FirestorePermissionError({
            path: 'collection_query',
            operation: 'list',
          });
          // Прокидываем оригинальную ошибку для доступа к ссылке индекса в консоли
          (permissionError as any).originalError = err;
          errorEmitter.emit('permission-error', permissionError);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryRef]);

  return { data, loading, error };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
