import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

/**
 * Инициализирует Firebase только в браузере.
 *
 * При статическом экспорте Next.js рендерит клиентские компоненты и на сервере
 * (prerender). Если инициализировать там Firebase — сборка падает на
 * `auth/invalid-api-key`, если ключ не задан. Поэтому на сервере возвращаем null,
 * а ошибки инициализации не роняют приложение.
 */
export function initializeFirebase(): FirebaseServices | null {
  if (typeof window === 'undefined') return null;

  try {
    const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);

    return { firebaseApp, firestore, auth };
  } catch (error) {
    console.error('[SLink] Не удалось инициализировать Firebase:', error);
    return null;
  }
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './error-emitter';
export * from './errors';
