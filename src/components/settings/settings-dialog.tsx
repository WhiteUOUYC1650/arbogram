
"use client";

import * as React from "react";
import { Settings, Loader2, Camera, Moon, Sun, User as UserIcon, Upload, Info, Languages } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { translations, Language } from "@/lib/i18n";

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = React.useMemo(() => (db && user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: userData } = useDoc(userRef);

  const avatarRef = useMemoFirebase(() => (db && user ? doc(db, "avatars", user.uid) : null), [db, user?.uid]);
  const { data: avatarData } = useDoc(avatarRef);

  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [photoURL, setPhotoURL] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const t = translations[lang];

  React.useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || "");
      setUsername(userData.username || "@");
    }
  }, [userData]);

  React.useEffect(() => {
    if (avatarData?.base64) {
      setPhotoURL(avatarData.base64);
    }
  }, [avatarData]);

  React.useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
    
    const isDark = storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const changeLanguage = (value: Language) => {
    setLang(value);
    localStorage.setItem("lang", value);
    window.location.reload();
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setPhotoURL(base64);
    } catch (err) {
      toast({ variant: "destructive", title: t.error, description: "Error processing image." });
    }
  };

  const handleSave = async () => {
    if (!db || !user || !userRef) return;
    setIsUpdating(true);
    try {
      if (username !== userData?.username) {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ variant: "destructive", title: t.error, description: "Username taken." });
          setIsUpdating(false);
          return;
        }
      }
      if (photoURL && photoURL.startsWith('data:image')) {
        await setDoc(doc(db, "avatars", user.uid), { base64: photoURL });
      }
      await updateDoc(userRef, { displayName, username, photoURL: user.uid });
      toast({ title: t.success, description: "Profile updated" });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: t.error, description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
        <DialogHeader><DialogTitle>{t.settings}</DialogTitle></DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={photoURL} className="object-cover" />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">{displayName[0] || <UserIcon />}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t.name}</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>{t.username}</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl font-mono" /></div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-orange-400" />}
                  <p className="text-sm font-semibold">{t.darkMode}</p>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
              </div>

              <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-accent" />
                  <p className="text-sm font-semibold">{t.language}</p>
                </div>
                <Select value={lang} onValueChange={(v: Language) => changeLanguage(v)}>
                  <SelectTrigger className="w-24 rounded-xl border-none bg-background/50 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ru">RU</SelectItem>
                    <SelectItem value="en">EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button className="w-full rounded-xl cove-gradient h-12 text-white font-bold" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t.save}
          </Button>
          <div className="flex flex-col items-center gap-1 pt-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Info className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">CoveChat v1.4.1 • Redirection • 2026</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
