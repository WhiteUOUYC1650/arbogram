
"use client";

import { useAuth, useUser, useFirestore } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading && db) {
      const userData = {
        uid: user.uid,
        displayName: user.displayName || email.split('@')[0] || "User",
        photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
        email: user.email,
        lastSeen: Date.now()
      };

      setDoc(doc(db, "users", user.uid), userData, { merge: true })
        .catch(async (e) => {
          const error = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: "write",
            requestResourceData: userData
          });
          errorEmitter.emit("permission-error", error);
        });
      
      router.push("/chat");
    }
  }, [user, loading, db, router, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email || !password) return;
    
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-primary/10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold font-headline text-foreground">Arbogram</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRegistering ? "Создайте аккаунт для общения" : "С возвращением в мессенджер"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-2">
              <Label htmlFor="name">Имя пользователя</Label>
              <Input 
                id="name"
                placeholder="Иван Иванов" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl border-primary/20 focus-visible:ring-accent"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              placeholder="name@example.com" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-primary/20 focus-visible:ring-accent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input 
              id="password"
              type="password"
              placeholder="••••••••" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-primary/20 focus-visible:ring-accent"
            />
          </div>

          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
          >
            {isSubmitting ? "Загрузка..." : (isRegistering ? "Зарегистрироваться" : "Войти")}
          </Button>
        </form>

        <div className="text-center">
          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-accent hover:underline font-medium p-2"
          >
            {isRegistering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
          </button>
        </div>
      </div>
    </div>
  );
}
