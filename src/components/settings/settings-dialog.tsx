
"use client";

import * as React from "react";
import { Settings, Loader2, Camera, Moon, Sun, User as UserIcon, Shield, Lock, Bell, Languages, Info, Phone } from "lucide-react";
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
  const t = translations[lang];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-xl rounded-3xl overflow-hidden p-0 h-[80vh] flex flex-col">
        <DialogHeader className="p-6 pb-0 border-b"><DialogTitle>{t.settings}</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm font-bold text-primary text-center">Redirection v1.1.2.1</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-sidebar/20 rounded-2xl border border-primary/10">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-orange-400" />}
                <p className="text-sm font-semibold">{t.darkMode}</p>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={(val) => {
                setIsDarkMode(val);
                document.documentElement.classList.toggle("dark", val);
              }} />
            </div>
          </div>
        </div>
        <div className="p-6 border-t bg-muted/30 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">CoveChat • Redirection • 2026</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
