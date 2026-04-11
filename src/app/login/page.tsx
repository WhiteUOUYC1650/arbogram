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
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ArbogramIcon } from "@/components/arbogram-icon";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("@");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading && !isSubmitting) {
      router.push("/");
    }
  }, [user, loading, isSubmitting, router]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("@")) {
      val = "@" + val.replace(/@/g, "");
    }
    setUsername(val.toLowerCase().replace(/\s/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !email || !password) return;
    
    if (isRegistering) {
      if (username === "@" || username.length < 4) {
        toast({ variant: "destructive", title: "Ошибка", description: "Юзернейм слишком короткий." });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          toast({ variant: "destructive", title: "Юзернейм занят", description: "Пожалуйста, выберите другой." });
          setIsSubmitting(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await updateProfile(newUser, {
          displayName: displayName || email.split('@')[0]
        });

        const userData = {
          uid: newUser.uid,
          displayName: displayName || email.split('@')[0],
          username: username,
          photoURL: "",
          email: newUser.email,
          lastSeen: Date.now()
        };

        await setDoc(doc(db, "users", newUser.uid), userData);
        toast({ title: "Успех!", description: "Аккаунт создан." });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "Произошла ошибка.";
      if (error.code === 'auth/email-already-in-use') message = "Этот Email уже используется.";
      if (error.code === 'auth/weak-password') message = "Пароль слишком простой.";
      if (error.code === 'auth/invalid-credential') message = "Неверный Email или пароль.";
      if (error.code === 'permission-denied') message = "Ошибка базы данных. Проверьте правила.";
      
      toast({ 
        variant: "destructive", 
        title: "Ошибка", 
        description: message 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center space-y-3">
          <ArbogramIcon className="w-16 h-16 shadow-lg" />
          <div className="text-center">
            <h1 className="text-2xl font-bold font-headline tracking-tight text-foreground">Arbogram</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              {isRegistering ? "Регистрация" : "Вход в аккаунт"}
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2rem] shadow-2xl border border-primary/5 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-[10px] uppercase font-bold ml-1 opacity-70">Имя</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="name"
                      placeholder="Александр" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11 pl-12 rounded-xl bg-muted/30 border-none focus-visible:ring-accent"
                      disabled={isSubmitting}
                      required={isRegistering}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-[10px] uppercase font-bold ml-1 opacity-70">Юзернейм</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-accent font-bold text-sm">@</span>
                    <Input 
                      id="username"
                      placeholder="username" 
                      value={username.substring(1)}
                      onChange={handleUsernameChange}
                      className="h-11 pl-10 rounded-xl bg-muted/30 border-none focus-visible:ring-accent font-mono"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <Label htmlFor="email" className="text-[10px] uppercase font-bold ml-1 opacity-70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  placeholder="name@example.com" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-12 rounded-xl bg-muted/30 border-none focus-visible:ring-accent"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-[10px] uppercase font-bold ml-1 opacity-70">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password"
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-12 rounded-xl bg-muted/30 border-none focus-visible:ring-accent"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-95 mt-4"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? "Создать аккаунт" : "Войти")}
            </Button>
          </form>

          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setDisplayName("");
                setUsername("@");
              }}
              className="text-xs text-accent hover:text-accent/80 font-bold p-2 transition-colors"
            >
              {isRegistering ? "Есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}