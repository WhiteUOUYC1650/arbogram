
"use client";

import { useAuth, useUser, useFirestore } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading && db) {
      // Сохраняем профиль пользователя без ожидания (optimistic UI)
      setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        lastSeen: Date.now()
      }, { merge: true }).catch(console.error);
      
      router.push("/chat");
    }
  }, [user, loading, db, router]);

  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      // Ошибки логина обрабатываются централизованно или игнорируются в MVP
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 text-center bg-white p-8 rounded-3xl shadow-xl border border-primary/10 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-headline text-foreground">Arbogram</h1>
          <p className="text-muted-foreground">Добро пожаловать в мессенджер нового поколения</p>
        </div>
        <Button 
          onClick={handleLogin}
          className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
        >
          Войти через Google
        </Button>
      </div>
    </div>
  );
}
