
"use client";

import { useAuth, useFirestore, useUser } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, User as UserIcon, ArrowRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { translations, Language } from "@/lib/i18n";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type AuthStep = "email" | "password" | "setup";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<AuthStep>("email");
  const [emailOrUser, setEmailOrUser] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("@");
  const [isNewUser, setIsNewUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<Language>('ru');

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  useEffect(() => {
    if (user && !loading && step !== "setup") {
      const checkProfile = async () => {
        if (!db || !user) return;
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const docSnap = await getDocs(q);
        if (docSnap.empty) {
          setStep("setup");
        } else {
          router.push("/");
        }
      };
      checkProfile();
    }
  }, [user, loading, db, router, step]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase();
    if (!val.startsWith("@")) {
      val = "@" + val.replace(/@/g, "");
    }
    setUsername(val.replace(/\s/g, ""));
  };

  const handleProceedToPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUser || !db) return;

    setIsSubmitting(true);
    try {
      let input = emailOrUser.trim();
      let targetEmail = "";

      // 1. Поиск по юзернейму
      if (input.startsWith("@")) {
        const q = query(collection(db, "users"), where("username", "==", input.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) targetEmail = snap.docs[0].data().email;
      } 
      // 2. Поиск по номеру телефона
      else if (/^[\d+]+$/.test(input.replace(/[\s-()]/g, ""))) {
        const normalized = normalizePhoneNumber(input);
        const q = query(collection(db, "users"), where("phoneNumber", "==", normalized), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) targetEmail = snap.docs[0].data().email;
      }
      // 3. Прямой ввод email
      else if (input.includes("@")) {
        targetEmail = input.toLowerCase();
      }

      if (targetEmail) {
        setResolvedEmail(targetEmail);
        setIsNewUser(false);
        setStep("password");
      } else {
        // Если ничего не найдено, предполагаем регистрацию по почте
        if (input.includes("@") && !input.startsWith("@")) {
          setResolvedEmail(input.toLowerCase());
          setIsNewUser(true);
          setStep("password");
        } else {
          toast({ variant: "destructive", title: t.error, description: "Аккаунт не найден. Для регистрации введите email." });
        }
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: t.error, description: "Ошибка при поиске аккаунта." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    setIsSubmitting(true);
    try {
      if (isNewUser) {
        if (password !== confirmPassword) {
          toast({ variant: "destructive", title: t.error, description: "Пароли не совпадают." });
          setIsSubmitting(false);
          return;
        }
        await createUserWithEmailAndPassword(auth, resolvedEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, resolvedEmail, password);
        router.push("/");
      }
    } catch (error: any) {
      let message = "Неверный пароль или ошибка входа.";
      if (error.code === 'auth/wrong-password') message = "Неверный пароль.";
      if (error.code === 'auth/user-not-found') message = "Пользователь не найден.";
      toast({ variant: "destructive", title: t.error, description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !user) return;

    const finalUsername = username.toLowerCase().trim();
    if (finalUsername === "@" || finalUsername.length < 4) {
      toast({ variant: "destructive", title: t.error, description: "Юзернейм слишком короткий." });
      return;
    }

    setIsSubmitting(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", finalUsername));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        toast({ variant: "destructive", title: t.error, description: "Этот юзернейм уже занят." });
        setIsSubmitting(false);
        return;
      }

      const finalDisplayName = displayName.trim() || resolvedEmail.split('@')[0];
      await updateProfile(user, { displayName: finalDisplayName });

      const userData = {
        uid: user.uid,
        displayName: finalDisplayName,
        username: finalUsername,
        photoURL: "",
        email: user.email?.toLowerCase(),
        phoneNumber: "",
        lastSeen: Date.now(),
        status: "online"
      };

      await setDoc(doc(db, "users", user.uid), userData);
      toast({ title: t.success, description: "Добро пожаловать в CoveChat!" });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: t.error, description: error.message || "Ошибка настройки." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4">
          <ArbogramIcon className="w-20 h-20 shadow-2xl animate-in zoom-in duration-700" />
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-bold font-headline tracking-tighter text-foreground">CoveChat</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.3em] font-headline opacity-80">
              {step === "email" ? "Идентификация" : step === "password" ? (isNewUser ? "Регистрация" : "Авторизация") : "Создание профиля"}
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2.5rem] shadow-2xl border border-primary/5 relative overflow-hidden">
          {step === "email" && (
            <form onSubmit={handleProceedToPassword} className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Email / @username / Телефон</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email"
                    placeholder="email, @user или номер" 
                    required
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || !emailOrUser}
                className="w-full h-12 cove-gradient hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Продолжить <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleAuth} className="space-y-6 animate-in slide-in-from-right duration-300">
              <button 
                type="button" 
                onClick={() => { setStep("email"); setIsNewUser(false); }}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
              >
                <ChevronLeft className="w-4 h-4" /> {emailOrUser}
              </button>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">
                    {isNewUser ? "Придумайте пароль" : t.password}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="password"
                      type="password"
                      placeholder="••••••••" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {isNewUser && (
                  <div className="space-y-2 animate-in fade-in duration-500">
                    <Label htmlFor="confirmPassword" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Подтвердите пароль</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••" 
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting || !password}
                className="w-full h-12 cove-gradient hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isNewUser ? "Создать аккаунт" : t.enter)}
              </Button>
            </form>
          )}

          {step === "setup" && (
            <form onSubmit={handleSetup} className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center space-y-2 mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="font-bold text-lg">Почти готово!</h3>
                <p className="text-xs text-muted-foreground">Настройте свой публичный профиль</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Ваше Имя</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="displayName"
                      placeholder="Иван Иванов" 
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Уникальный Юзернейм</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-primary font-bold text-sm">@</span>
                    <Input 
                      id="username"
                      placeholder="username" 
                      required
                      value={username.substring(1)}
                      onChange={handleUsernameChange}
                      className="h-12 pl-10 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary font-mono text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting || !displayName || username === "@"}
                className="w-full h-12 cove-gradient hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Завершить настройку"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
