
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
import { Loader2, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2, Phone, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, setDoc, collection, query, where, getDocs, limit, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { translations, Language } from "@/lib/i18n";
import { normalizePhoneNumber } from "@/lib/phone-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AuthMode = "login" | "register" | "setup" | "recovery";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("login");
  const [emailOrUserOrPhone, setEmailOrUserOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("@");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  
  // Recovery State
  const [recoveryPin, setRecoveryPin] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"input" | "pin">("input");
  const [foundUserForRecovery, setFoundUserForRecovery] = useState<any>(null);

  useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  useEffect(() => {
    if (user && !loading && mode !== "setup") {
      const checkProfile = async () => {
        if (!db || !user) return;
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const docSnap = await getDocs(q);
        if (docSnap.empty) {
          setMode("setup");
        } else {
          router.push("/");
        }
      };
      checkProfile();
    }
  }, [user, loading, db, router, mode]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase();
    if (!val.startsWith("@")) {
      val = "@" + val.replace(/@/g, "");
    }
    setUsername(val.replace(/\s/g, ""));
  };

  const resolveTarget = async (input: string) => {
    if (!db) return null;
    let targetEmail = "";
    let foundData = null;
    
    // 1. Поиск по юзернейму
    if (input.startsWith("@")) {
      const q = query(collection(db, "users"), where("username", "==", input.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetEmail = snap.docs[0].data().email;
        foundData = snap.docs[0].data();
      }
    } 
    // 2. Поиск по номеру телефона
    else if (/^[\d+]+$/.test(input.replace(/[\s-()]/g, ""))) {
      const normalized = normalizePhoneNumber(input);
      const q = query(collection(db, "users"), where("phoneNumber", "==", normalized), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetEmail = snap.docs[0].data().email;
        foundData = snap.docs[0].data();
      } else {
        // Если номер новый для регистрации
        targetEmail = `${normalized.replace('+', '')}@covechat.local`;
      }
    }
    // 3. Прямой ввод email
    else if (input.includes("@")) {
      targetEmail = input.toLowerCase();
    }

    return { targetEmail, foundData };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !emailOrUserOrPhone || !password) return;

    setIsSubmitting(true);
    try {
      const { targetEmail } = await resolveTarget(emailOrUserOrPhone);
      
      if (!targetEmail) {
        toast({ variant: "destructive", title: t.error, description: "Аккаунт не найден." });
        setIsSubmitting(false);
        return;
      }

      await signInWithEmailAndPassword(auth, targetEmail, password);
      router.push("/");
    } catch (error: any) {
      let message = "Ошибка входа.";
      if (error.code === 'auth/wrong-password') message = "Неверный пароль.";
      if (error.code === 'auth/user-not-found') message = "Аккаунт не найден.";
      toast({ variant: "destructive", title: t.error, description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !emailOrUserOrPhone || !password) return;

    setIsSubmitting(true);
    try {
      const { targetEmail, foundData } = await resolveTarget(emailOrUserOrPhone);
      
      if (foundData) {
        toast({ variant: "destructive", title: t.error, description: "Этот аккаунт уже существует. Войдите." });
        setIsSubmitting(false);
        return;
      }

      await createUserWithEmailAndPassword(auth, targetEmail, password);
      // Автоматически переключит в setup через useEffect
    } catch (error: any) {
      toast({ variant: "destructive", title: t.error, description: "Ошибка регистрации." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !user) return;

    const finalUsername = (username === "@" && emailOrUserOrPhone.startsWith("@")) 
      ? emailOrUserOrPhone.toLowerCase().trim() 
      : username.toLowerCase().trim();

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

      const finalDisplayName = displayName.trim() || user.email?.split('@')[0] || "User";
      await updateProfile(user, { displayName: finalDisplayName });

      let finalPhone = "";
      if (/^[\d+]+$/.test(emailOrUserOrPhone.replace(/[\s-()]/g, ""))) {
        finalPhone = normalizePhoneNumber(emailOrUserOrPhone);
      }

      const userData = {
        uid: user.uid,
        displayName: finalDisplayName,
        username: finalUsername,
        photoURL: "",
        email: user.email?.toLowerCase(),
        phoneNumber: finalPhone,
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

  const handleStartRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !emailOrUserOrPhone) return;

    setIsSubmitting(true);
    try {
      const { foundData } = await resolveTarget(emailOrUserOrPhone);
      if (foundData) {
        setFoundUserForRecovery(foundData);
        setRecoveryStep("pin");
      } else {
        toast({ variant: "destructive", title: t.error, description: "Аккаунт не найден." });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPin = () => {
    if (!foundUserForRecovery) return;
    if (foundUserForRecovery.secretPin && foundUserForRecovery.secretPin === recoveryPin) {
      toast({ title: "ПИН верный", description: "Для сброса пароля используйте форму входа или обратитесь к администратору." });
    } else {
      toast({ variant: "destructive", title: "Ошибка", description: "Неверный ПИН-код." });
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
              {mode === "login" ? t.login : mode === "register" ? t.registration : mode === "recovery" ? t.recoveryTitle : "Setup"}
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2.5rem] shadow-2xl border border-primary/5 relative overflow-hidden">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Email / @User / Phone</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="email, @user или номер" 
                      required
                      value={emailOrUserOrPhone}
                      onChange={(e) => setEmailOrUserOrPhone(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[10px] uppercase font-bold opacity-70 tracking-widest">{t.password}</Label>
                    <button type="button" onClick={() => setMode("recovery")} className="text-[10px] text-primary font-bold hover:underline">{t.forgotPassword}</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="password"
                      placeholder="••••••••" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    />
                  </div>
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || !emailOrUserOrPhone || !password}
                className="w-full h-12 cove-gradient hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.enter} <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <div className="text-center pt-2">
                <button type="button" onClick={() => setMode("register")} className="text-xs text-muted-foreground hover:text-primary">
                  Нет аккаунта? <span className="font-bold">Зарегистрироваться</span>
                </button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Email / @User / Phone</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="email, @user или номер" 
                      required
                      value={emailOrUserOrPhone}
                      onChange={(e) => setEmailOrUserOrPhone(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Придумайте пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="password"
                      placeholder="••••••••" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    />
                  </div>
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || !emailOrUserOrPhone || !password}
                className="w-full h-12 cove-gradient hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.registration} <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <div className="text-center pt-2">
                <button type="button" onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-primary">
                  Уже есть аккаунт? <span className="font-bold">Войти</span>
                </button>
              </div>
            </form>
          )}

          {mode === "setup" && (
            <form onSubmit={handleSetup} className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center space-y-2 mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="font-bold text-lg">Почти готово!</h3>
                <p className="text-xs text-muted-foreground">Настройте свой публичный профиль</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Ваше Имя</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Иван Иванов" 
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    />
                  </div>
                </div>

                {!emailOrUserOrPhone.startsWith("@") && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Уникальный Юзернейм</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-primary font-bold text-sm">@</span>
                      <Input 
                        placeholder="username" 
                        required
                        value={username.substring(1)}
                        onChange={handleUsernameChange}
                        className="h-12 pl-10 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary font-mono text-base"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button 
                type="submit"
                disabled={isSubmitting || !displayName || (username === "@" && !emailOrUserOrPhone.startsWith("@"))}
                className="w-full h-12 rounded-2xl cove-gradient text-white font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Завершить настройку"}
              </Button>
            </form>
          )}

          {mode === "recovery" && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
              <div className="text-center space-y-2">
                <KeyRound className="w-12 h-12 text-primary mx-auto" />
                <h3 className="font-bold text-lg">{t.recoveryTitle}</h3>
              </div>

              {recoveryStep === "input" ? (
                <form onSubmit={handleStartRecovery} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Email / Phone / @User</Label>
                    <Input 
                      placeholder="Для поиска..." 
                      required
                      value={emailOrUserOrPhone}
                      onChange={(e) => setEmailOrUserOrPhone(e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-2xl bg-primary text-white font-bold">Найти аккаунт</Button>
                </form>
              ) : (
                <div className="space-y-6">
                  {foundUserForRecovery?.secretPin ? (
                    <div className="space-y-4">
                      <Label className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">{t.enterPin}</Label>
                      <Input 
                        placeholder="Секретный код..." 
                        value={recoveryPin}
                        onChange={(e) => setRecoveryPin(e.target.value)}
                        className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                      />
                      <Button onClick={handleCheckPin} className="w-full h-12 rounded-2xl bg-primary text-white font-bold">Проверить</Button>
                    </div>
                  ) : (
                    <div className="p-4 bg-destructive/10 rounded-2xl border border-destructive/20 text-center space-y-3">
                      <p className="text-sm font-medium text-destructive">У вас не установлен ПИН-код</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.noPinDesc}</p>
                    </div>
                  )}
                </div>
              )}

              <button type="button" onClick={() => { setMode("login"); setRecoveryStep("input"); setFoundUserForRecovery(null); }} className="w-full text-xs text-muted-foreground hover:text-primary text-center">Вернуться назад</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
