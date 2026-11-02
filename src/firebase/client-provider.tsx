'use client';

import React, { useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Инициализируем Firebase один раз и только на клиенте
  const services = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider
      firebaseApp={services?.firebaseApp ?? null}
      firestore={services?.firestore ?? null}
      auth={services?.auth ?? null}
    >
      {children}
    </FirebaseProvider>
  );
}
