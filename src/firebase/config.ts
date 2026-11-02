/**
 * Конфигурация Firebase.
 * Значения берутся из NEXT_PUBLIC_* переменных окружения (CI/хостинг),
 * а если их нет — используется текущий рабочий проект SLink.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBfca62tIUFPv6g4tJMI_CX0iJ6KcrJtM8',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'covechat-a1344.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'covechat-a1344',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'covechat-a1344.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '156058624037',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:156058624037:web:e8110587f2efb8b3035fcc',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-D3THN5XGSC',
};
