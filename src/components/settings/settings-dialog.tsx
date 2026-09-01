
"use client";

import * as React from "react";
import { Settings, Loader2, Camera, Moon, Sun, User as UserIcon, Shield, Lock, Bell, Languages, Info, Phone, AtSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { translations, Language } from "@/lib/i18n";
import { normalizePhoneNumber } from "@/lib/phone-utils";

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
  
  const [displayName, setDisplayName] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [username, setUsername] = React.useState("");

  React.useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || "");
      setPhoneNumber(userData.phoneNumber || "");
      setUsername(userData.username || "");
    }
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, [userData]);

  const t = translations[lang];

  const handleUpdateProfile = async () => {
    if (!db || !user) return;
    setIsUpdating(true);
    try {
      const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : "";
      
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        phoneNumber: normalizedPhone,
      });

      toast({ title: t.success, description: "Профиль обновлен" });
    } catch (e: any) {
      toast({ variant: "destructive", title: t.error, description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-xl rounded-[2.5rem] overflow-hidden p-0 h-[85vh] flex flex-col border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {t.settings}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-muted/30 h-12">
            <TabsTrigger value="profile">{t.profile}</TabsTrigger>
            <TabsTrigger value="appearance">{t.darkMode}</TabsTrigger>
            <TabsTrigger value="language">{t.language}</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              <TabsContent value="profile" className="space-y-6 mt-0">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 border-4 border-primary/10 shadow-lg">
                      <AvatarImage src={userData?.photoURL} />
                      <AvatarFallback className="text-2xl font-bold bg-primary/5">{userData?.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <Button variant="secondary" size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md border-2 border-white">
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">{userData?.username}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">{t.name}</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-12 h-12 rounded-2xl bg-muted/30 border-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1 opacity-70">Телефон</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="pl-12 h-12 rounded-2xl bg-muted/30 border-none" />
                    </div>
                  </div>

                  <Button className="w-full h-12 rounded-2xl cove-gradient text-white font-bold" onClick={handleUpdateProfile} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t.save}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4 mt-0">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t.darkMode}</p>
                      <p className="text-[10px] text-muted-foreground">Переключить визуальную тему</p>
                    </div>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={(val) => {
                    setIsDarkMode(val);
                    document.documentElement.classList.toggle("dark", val);
                  }} />
                </div>
              </TabsContent>

              <TabsContent value="language" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60 px-1">{t.language}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={lang === 'ru' ? 'default' : 'outline'} 
                      onClick={() => changeLanguage('ru')}
                      className="h-14 rounded-2xl font-bold gap-3"
                    >
                      🇷🇺 Русский
                    </Button>
                    <Button 
                      variant={lang === 'en' ? 'default' : 'outline'} 
                      onClick={() => changeLanguage('en')}
                      className="h-14 rounded-2xl font-bold gap-3"
                    >
                      🇺🇸 English
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="p-6 border-t bg-muted/20 text-center shrink-0">
          <p className="text-xs font-bold text-primary tracking-widest">CoveChat • Redirection v1.1.2.2</p>
          <p className="text-[9px] text-muted-foreground mt-1 uppercase">Relay Engine Powered • 2026</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
