/**
 * Конфигурация Firebase.
 *
 * Значения берутся из NEXT_PUBLIC_* переменных окружения (CI / хостинг),
 * а если переменная не задана ИЛИ пустая — используется текущий рабочий проект SLink.
 *
 * Важно: GitHub Actions подставляет пустую строку, если секрет не создан,
 * поэтому `??` тут недостаточно — нужен trim-фолбэк, иначе Firebase падает
 * с auth/invalid-api-key во время статической сборки.
 */
const env = (value: string | undefined, fallback: string) =>
  value && value.trim() ? value.trim() : fallback;

export const firebaseConfig = {
  apiKey: env(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 'AIzaSyBfca62tIUFPv6g4tJMI_CX0iJ6KcrJtM8'),
  authDomain: env(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, 'covechat-a1344.firebaseapp.com'),
  projectId: env(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, 'covechat-a1344'),
  storageBucket: env(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    'covechat-a1344.firebasestorage.app',
  ),
  messagingSenderId: env(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '156058624037'),
  appId: env(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, '1:156058624037:web:e8110587f2efb8b3035fcc'),
  measurementId: env(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, 'G-D3THN5XGSC'),
};
