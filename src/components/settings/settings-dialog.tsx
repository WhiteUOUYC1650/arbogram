
"use client";

import * as React from "react";
import { Settings, Loader2, Camera, Moon, Sun, Check, User as UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
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

  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [photoURL, setPhotoURL] = React.useState("");

  React.useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || "");
      setUsername(userData.username || "@");
      setPhotoURL(userData.photoURL || "");
    }
  }, [userData]);

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("@")) val = "@" + val.replace("@", "");
    setUsername(val.toLowerCase().replace(/\s/g, ""));
  };

  const handleSave = async () => {
    if (!db || !user || !userRef) return;
    
    if (username === "@" || username.length < 3) {
      toast({ variant: "destructive", title: "Ошибка", description: "Юзернейм слишком короткий." });
      return;
    }

    setIsUpdating(true);
    try {
      // Проверка уникальности юзернейма, если он изменился
      if (username !== userData?.username) {
        const q = query(collection(db, "users"), where("username", "==", username));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast({ variant: "destructive", title: "Ошибка", description: "Этот юзернейм уже занят." });
          setIsUpdating(false);
          return;
        }
      }

      await updateDoc(userRef, {
        displayName,
        username,
        photoURL
      });

      toast({ title: "Профиль обновлен", description: "Ваши данные успешно сохранены." });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const changeAvatar = () => {
    const randomAvatar = PlaceHolderImages.filter(img => img.id.startsWith('avatar-'))[
      Math.floor(Math.random() * 3)
    ];
    setPhotoURL(randomAvatar.imageUrl);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Настройки профиля</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={changeAvatar}>
              <Avatar className="w-24 h-24 border-4 border-accent/20">
                <AvatarImage src={photoURL} />
                <AvatarFallback className="text-2xl bg-accent/10 text-accent">
                  {displayName[0] || <UserIcon />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Нажмите, чтобы сменить аватар</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Ваше имя</Label>
              <Input 
                id="displayName"
                placeholder="Имя Фамилия" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Юзернейм</Label>
              <Input 
                id="username"
                placeholder="@username" 
                value={username}
                onChange={handleUsernameChange}
                className="rounded-xl font-mono"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-accent" /> : <Sun className="w-5 h-5 text-orange-400" />}
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Темная тема</p>
                  <p className="text-[10px] text-muted-foreground">Экономит заряд и бережет глаза</p>
                </div>
              </div>
              <Switch 
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
              />
            </div>
          </div>

          <Button 
            className="w-full rounded-xl bg-accent h-12 text-white font-semibold shadow-lg shadow-accent/20" 
            onClick={handleSave} 
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Сохранить изменения</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
