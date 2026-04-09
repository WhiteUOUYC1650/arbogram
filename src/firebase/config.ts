
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKey",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8196387615-98503"}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8196387615-98503",
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8196387615-98503"}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};
