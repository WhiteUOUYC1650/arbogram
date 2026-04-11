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
    // Если пользователь залогинен и мы не в процессе отправки формы - уходим на главную
    if (user && !loading && !isSubmitting) {
      router.push("/");
    }
  }, [user, loading, isSubmitting, router]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Всегда держим @ в начале
    if (!val.startsWith("@")) {
      val = "@" + val.replace(/@/g, "");
    }
    // Убираем пробелы и приводим к нижнему регистру
    setUsername(val.toLowerCase().replace(/\s/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !email || !password) return;
    
    // Валидация юзернейма при регистрации
    if (isRegistering) {
      if (username === "@" || username.length < 4) {
        toast({ variant: "destructive", title: "Ошибка", description: "Юзернейм слишком короткий (минимум 3 символа после @)." });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        // 1. Проверка уникальности юзернейма
        const q = query(collection(db, "users"), where("username", "==", username));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          toast({ variant: "destructive", title: "Юзернейм занят", description: "Пожалуйста, выберите другой." });
          setIsSubmitting(false);
          return;
        }

        // 2. Создание аккаунта
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // 3. Обновление базового профиля Firebase Auth
        await updateProfile(newUser, {
          displayName: displayName || email.split('@')[0]
        });

        // 4. Создание документа пользователя в Firestore
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
        router.push("/");
      } else {
        // Вход
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "Произошла ошибка при входе.";
      if (error.code === 'auth/email-already-in-use') message = "Этот Email уже используется.";
      if (error.code === 'auth/weak-password') message = "Пароль слишком простой.";
      if (error.code === 'auth/invalid-credential') message = "Неверный Email или пароль.";
      
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
        <div className="flex flex-col items-center space-y-4">
          <ArbogramIcon className="w-16 h-16 shadow-md" />
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Arbogram</h1>
            <p className="text-sm text-muted-foreground">
              {isRegistering ? "Создайте аккаунт" : "С возвращением"}
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2rem] shadow-2xl border border-primary/5 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="name" className="ml-1">Имя</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="name"
                      placeholder="Александр" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus-visible:ring-accent"
                      disabled={isSubmitting}
                      required={isRegistering}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="ml-1">Юзернейм</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-accent font-bold">@</span>
                    <Input 
                      id="username"
                      placeholder="username" 
                      value={username.substring(1)}
                      onChange={handleUsernameChange}
                      className="h-12 pl-10 rounded-xl bg-muted/30 border-none focus-visible:ring-accent font-mono"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="ml-1">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email"
                  placeholder="name@example.com" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus-visible:ring-accent"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="ml-1">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password"
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-12 rounded-xl bg-muted/30 border-none focus-visible:ring-accent"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-accent hover:bg-accent/90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-accent/20 transition-all active:scale-95 mt-2"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (isRegistering ? "Регистрация" : "Войти")}
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
              className="text-sm text-accent hover:text-accent/80 font-bold p-2 transition-colors"
            >
              {isRegistering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
            </button>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Arbogram v0.1 • 2024
        </p>
      </div>
    </div>
  );
}