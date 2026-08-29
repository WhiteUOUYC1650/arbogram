
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
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { translations, Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AuthStep = "email" | "password" | "setup";

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
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
      // Проверяем, есть ли уже профиль в Firestore
      const checkProfile = async () => {
        if (!db || !user) return;
        const docSnap = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)));
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
    let val = e.target.value;
    if (!val.startsWith("@")) {
      val = "@" + val.replace(/@/g, "");
    }
    setUsername(val.toLowerCase().replace(/\s/g, ""));
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !email) return;
    setIsSubmitting(true);
    try {
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const snapshot = await getDocs(q);
      setIsNewUser(snapshot.empty);
      setStep("password");
    } catch (error) {
      toast({ variant: "destructive", title: t.error, description: "Ошибка проверки почты." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    if (isNewUser && password !== confirmPassword) {
      toast({ variant: "destructive", title: t.error, description: "Пароли не совпадают." });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isNewUser) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setStep("setup");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
      }
    } catch (error: any) {
      let message = "Произошла ошибка.";
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

    if (username === "@" || username.length < 4) {
      toast({ variant: "destructive", title: t.error, description: "Юзернейм слишком короткий." });
      return;
    }

    setIsSubmitting(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", username));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        toast({ variant: "destructive", title: t.error, description: "Юзернейм занят." });
        setIsSubmitting(false);
        return;
      }

      await updateProfile(user, {
        displayName: displayName || email.split('@')[0]
      });

      const userData = {
        uid: user.uid,
        displayName: displayName || email.split('@')[0],
        username: username,
        photoURL: "",
        email: user.email?.toLowerCase(),
        lastSeen: Date.now()
      };

      await setDoc(doc(db, "users", user.uid), userData);
      toast({ title: t.success, description: "Добро пожаловать в Cove!" });
      router.push("/");
    } catch (error) {
      toast({ variant: "destructive", title: t.error, description: "Ошибка создания профиля." });
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
              {step === "email" ? "Identification" : step === "password" ? (isNewUser ? "Security Setup" : "Authorization") : "Profile Creation"}
            </p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[2.5rem] shadow-2xl border border-primary/5 relative overflow-hidden">
          {/* Email Step */}
          {step === "email" && (
            <form onSubmit={handleCheckEmail} className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email"
                    type="email"
                    placeholder="name@example.com" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <Button 
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full h-12 cove-gradient hover:opacity-90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </form>
          )}

          {/* Password Step */}
          {step === "password" && (
            <form onSubmit={handleAuth} className="space-y-6 animate-in slide-in-from-right duration-300">
              <button 
                type="button" 
                onClick={() => setStep("email")}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
              >
                <ChevronLeft className="w-4 h-4" /> {email}
              </button>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">
                    {isNewUser ? "Create Password" : t.password}
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
                    <Label htmlFor="confirmPassword" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Confirm Password</Label>
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
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isNewUser ? "Create Account" : t.enter)}
              </Button>
            </form>
          )}

          {/* Setup Step */}
          {step === "setup" && (
            <form onSubmit={handleSetup} className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center space-y-2 mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="font-bold text-lg">Account Created!</h3>
                <p className="text-xs text-muted-foreground">Now, set up your public profile</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Display Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="displayName"
                      placeholder="e.g. John Doe" 
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[10px] uppercase font-bold ml-1 opacity-70 tracking-widest">Unique Username</Label>
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
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Setup"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
