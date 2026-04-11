
"use client";

import { useAuth, useUser, useFirestore } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Chrome } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.54.26l.213-3.047 5.55-5.015c.24-.213-.054-.334-.373-.12l-6.86 4.32-2.95-.92c-.64-.203-.653-.64.135-.947l11.52-4.44c.533-.193.996.126.845.903z" />
  </svg>
);

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
      router.push("/chat");
    }
  }, [user, loading, isSubmitting, router]);

  const validateUsername = (name: string) => {
    return name.startsWith("@") && name.length >= 3;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || val === "@") {
      setUsername("@");
    } else if (val.startsWith("@")) {
      setUsername(val.toLowerCase().replace(/\s/g, ""));
    } else {
      setUsername("@" + val.toLowerCase().replace(/\s/g, ""));
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || !db) return;
    setIsSubmitting(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;

      const userDoc = await getDoc(doc(db, "users", loggedUser.uid));
      
      if (!userDoc.exists()) {
        const baseUsername = loggedUser.displayName 
          ? loggedUser.displayName.toLowerCase().replace(/\s/g, "_") 
          : loggedUser.email?.split('@')[0] || "user";
        
        let finalUsername = `@${baseUsername}`;
        
        const q = query(collection(db, "users"), where("username", "==", finalUsername));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          finalUsername = `@${baseUsername}_${loggedUser.uid.substring(0, 4)}`;
        }

        const avatar = PlaceHolderImages.find(img => img.id === 'avatar-1')?.imageUrl || "";

        const userData = {
          uid: loggedUser.uid,
          displayName: loggedUser.displayName || loggedUser.email?.split('@')[0] || "User",
          username: finalUsername,
          photoURL: loggedUser.photoURL || avatar,
          email: loggedUser.email,
          lastSeen: Date.now()
        };

        await setDoc(doc(db, "users", loggedUser.uid), userData);
      }
      
      router.push("/chat");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ошибка Google входа",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTelegramLogin = async () => {
    setIsSubmitting(true);
    // Это симуляция, так как настоящий TG Login требует серверной проверки хеша
    toast({
      title: "Telegram Login (Mock)",
      description: "Для работы этой функции нужно подключить бота. В прототипе мы имитируем процесс.",
    });
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !email || !password) return;
    
    if (isRegistering && !validateUsername(username)) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Юзернейм должен начинаться с @ и содержать минимум 2 символа после него.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        try {
          const q = query(collection(db, "users"), where("username", "==", username));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            await deleteUser(newUser);
            throw new Error("Этот юзернейм уже занят.");
          }

          if (displayName) {
            await updateProfile(newUser, { displayName });
          }

          const defaultAvatar = PlaceHolderImages.find(img => img.id === 'avatar-1')?.imageUrl || "";

          const userData = {
            uid: newUser.uid,
            displayName: displayName || email.split('@')[0],
            username: username,
            photoURL: defaultAvatar,
            email: newUser.email,
            lastSeen: Date.now()
          };

          await setDoc(doc(db, "users", newUser.uid), userData);
          router.push("/chat");
        } catch (innerError: any) {
          toast({
            variant: "destructive",
            title: "Ошибка регистрации",
            description: innerError.message,
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/chat");
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
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-xl border border-primary/10">
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

        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
          >
            <Chrome className="w-5 h-5" />
            <span>Войти через Google</span>
          </Button>

          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl border-primary/20 hover:bg-primary/5 flex items-center justify-center gap-2"
            onClick={handleTelegramLogin}
            disabled={isSubmitting}
          >
            <TelegramIcon className="w-5 h-5 text-[#24A1DE]" />
            <span>Войти через Telegram</span>
          </Button>

          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Или через email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Имя (отображаемое)</Label>
                <Input 
                  id="name"
                  placeholder="Иван Иванов" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-xl"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Юзернейм (обязательно @)</Label>
                <Input 
                  id="username"
                  placeholder="@ivan_the_great" 
                  value={username}
                  onChange={handleUsernameChange}
                  className="rounded-xl font-mono"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </>
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
              className="rounded-xl"
              disabled={isSubmitting}
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
              className="rounded-xl"
              disabled={isSubmitting}
            />
          </div>

          <Button 
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl"
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
