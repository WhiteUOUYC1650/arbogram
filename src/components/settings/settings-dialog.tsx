"use client";

import * as React from "react";
import { Settings, Loader2, Camera, Moon, Sun, User as UserIcon, Shield, Lock, Bell, Languages, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    if (avatarData?.base64) setPhotoURL(avatarData.base64);
  }, [avatarData]);

  React.useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    localStorage.setItem("theme", checked ? "dark" : "light");
  };

  const handleSave = async () => {
    if (!db || !user || !userRef) return;
    setIsUpdating(true);
    try {
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
      <DialogContent className="w-[95vw] sm:max-w-xl rounded-3xl overflow-hidden p-0 h-[80vh] flex flex-col">
        <DialogHeader className="p-6 pb-0 border-b"><DialogTitle>{t.settings}</DialogTitle></DialogHeader>
        <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 mx-6 mt-4 h-12 bg-muted/50 rounded-xl">
            <TabsTrigger value="profile"><UserIcon className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="privacy"><Shield className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="security"><Lock className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-4 h-4" /></TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="profile" className="mt-0 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    <AvatarImage src={photoURL} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">{displayName[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setPhotoURL(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t.name}</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" /></div>
                <div className="space-y-2"><Label>{t.username}</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl font-mono" /></div>
                
                <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-orange-400" />}
                    <p className="text-sm font-semibold">{t.darkMode}</p>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-3"><Languages className="w-5 h-5 text-accent" /><p className="text-sm font-semibold">{t.language}</p></div>
                  <Select value={lang} onValueChange={(v: Language) => setLang(v)}>
                    <SelectTrigger className="w-24 border-none bg-background/50 h-8 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl"><SelectItem value="ru">RU</SelectItem><SelectItem value="en">EN</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                <p className="text-sm font-semibold">{t.showOnline}</p><Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                <p className="text-sm font-semibold">{t.allowCalls}</p><Switch defaultChecked />
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                <p className="text-sm font-semibold">{t.twoStep}</p><Switch />
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
                <p className="text-sm font-semibold">{t.pushNotifications}</p><Switch defaultChecked />
              </div>
            </TabsContent>
          </div>
        </Tabs>
        <div className="p-6 border-t bg-muted/30">
          <Button className="w-full rounded-xl cove-gradient h-12 text-white font-bold" onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t.save}
          </Button>
          <div className="flex flex-col items-center gap-1 pt-4 text-muted-foreground">
            <div className="flex items-center gap-1.5"><Info className="w-3 h-3" /><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">CoveChat v1.1 • Redirection • 2026</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
