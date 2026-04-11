"use client";

import * as React from "react";
import { Settings, Loader2, Camera, Moon, Sun, Check, User as UserIcon, Upload, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
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
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains("dark");
    setIsDarkMode(!!isDark);
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось обработать изображение." });
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("@")) val = "@" + val.replace("@", "");
    setUsername(val.toLowerCase().replace(/\s/g, ""));
  };

  const handleSave = async () => {
    if (!db || !user || !userRef) return;
    setIsUpdating(true);
    try {
      if (username !== userData?.username) {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ variant: "destructive", title: "Ошибка", description: "Этот юзернейм уже занят." });
          setIsUpdating(false);
          return;
        }
      }
      if (photoURL && photoURL.startsWith('data:image')) {
        await setDoc(doc(db, "avatars", user.uid), { base64: photoURL });
      }
      await updateDoc(userRef, { displayName, username, photoURL: user.uid });
      toast({ title: "Профиль обновлен" });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
        <DialogHeader><DialogTitle>Настройки профиля</DialogTitle></DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-24 h-24 border-4 border-accent/20">
                <AvatarImage src={photoURL} className="object-cover" />
                <AvatarFallback className="text-2xl bg-accent/10 text-accent">{displayName[0] || <UserIcon />}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Upload className="w-3 h-3" /> Нажмите для фото</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Ваше имя</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Юзернейм</Label><Input value={username} onChange={handleUsernameChange} className="rounded-xl font-mono" /></div>
            <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-3">{isDarkMode ? <Moon className="w-5 h-5 text-accent" /> : <Sun className="w-5 h-5 text-orange-400" />}<p className="text-sm font-semibold">Темная тема</p></div>
              <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
            </div>
          </div>
          <Button className="w-full rounded-xl bg-accent h-12" onClick={handleSave} disabled={isUpdating}>{isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Сохранить изменения"}</Button>
          <div className="flex flex-col items-center gap-1 pt-2">
            <div className="flex items-center gap-1.5 text-muted-foreground"><Info className="w-3 h-3" /><span className="text-[10px] font-medium uppercase tracking-widest text-accent">Arbogram v0.1</span></div>
            <p className="text-[8px] text-muted-foreground/60 italic">Сделано для APK</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}