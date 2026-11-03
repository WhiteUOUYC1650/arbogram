"use client";

import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  // redirect() из next/navigation нельзя вызывать в клиентском эффекте —
  // он бросает NEXT_REDIRECT и ломает рендер. Используем роутер.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, 'users', user.uid);

    const updateStatus = (status: 'online' | 'offline') => {
      updateDoc(userRef, {
        status,
        lastSeen: Date.now(),
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      updateStatus(document.visibilityState === 'visible' ? 'online' : 'offline');
    };

    updateStatus('online');

    const handleFocus = () => updateStatus('online');
    const handleBlur = () => updateStatus('offline');
    const handleUnload = () => updateStatus('offline');

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      updateStatus('offline');
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, db]);

  if (loading || (!user && typeof window !== 'undefined')) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
}
