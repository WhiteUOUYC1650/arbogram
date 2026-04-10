
"use client";

import { useAuth, useUser, useFirestore } from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

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

          // Назначаем одну из доступных аватарок-заглушек
          const randomAvatar = PlaceHolderImages.find(img => img.id.startsWith('avatar'))?.imageUrl || "";

          const userData = {
            uid: newUser.uid,
            displayName: displayName || email.split('@')[0],
            username: username,
            photoURL: randomAvatar,
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
