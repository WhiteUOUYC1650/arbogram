
"use client";

import { useUser, useFirestore } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (!loading && !user) {
      redirect("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, "users", user.uid);

    const updateStatus = (status: "online" | "offline") => {
      updateDoc(userRef, {
        status,
        lastSeen: Date.now()
      }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      updateStatus(document.visibilityState === "visible" ? "online" : "offline");
    };

    // Принудительно устанавливаем онлайн при входе
    updateStatus("online");

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", () => updateStatus("online"));
    window.addEventListener("blur", () => updateStatus("offline"));
    window.addEventListener("beforeunload", () => updateStatus("offline"));

    return () => {
      updateStatus("offline");
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", () => updateStatus("online"));
      window.removeEventListener("blur", () => updateStatus("offline"));
      window.removeEventListener("beforeunload", () => updateStatus("offline"));
    };
  }, [user, db]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
}
