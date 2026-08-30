"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { MessageSquare, Phone, Mail, User as UserIcon, Calendar } from "lucide-react";
import { translations, Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface UserProfileDialogProps {
  userId: string;
  children: React.ReactNode;
  onStartChat?: (userId: string) => void;
}

export function UserProfileDialog({ userId, children, onStartChat }: UserProfileDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const db = useFirestore();

  React.useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  const userRef = useMemoFirebase(() => (db && userId ? doc(db, "users", userId) : null), [db, userId]);
  const { data: userData, loading } = useDoc(userRef);

  if (!userId || userId === "p7gSC3o9OxVezsjDbrFq") return <>{children}</>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="relative h-32 cove-gradient w-full" />
        <div className="px-6 pb-8 -mt-16 flex flex-col items-center">
          <div className="relative group">
            <UserAvatar 
              userId={userId} 
              fallback={userData?.displayName} 
              className="w-32 h-32 border-4 border-background shadow-xl rounded-[2.5rem]" 
            />
            {userData?.status === 'online' && (
              <span className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-background rounded-full" />
            )}
          </div>

          <div className="text-center mt-4 space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{userData?.displayName || "..."}</h2>
            <p className="text-primary font-mono text-sm">{userData?.username || "@..."}</p>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full inline-block",
              userData?.status === 'online' ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
            )}>
              {userData?.status === 'online' ? t.online : t.offline}
            </p>
          </div>

          <div className="w-full mt-8 space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-primary/5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Телефон</p>
                <p className="text-sm font-medium truncate">{userData?.phoneNumber || "Не указан"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-primary/5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email</p>
                <p className="text-sm font-medium truncate">{userData?.email || "Скрыт"}</p>
              </div>
            </div>

            {userData?.lastSeen && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-primary/5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Последний визит</p>
                  <p className="text-sm font-medium truncate">
                    {new Date(userData.lastSeen).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="w-full mt-8 flex gap-3">
            <Button 
              className="flex-1 h-12 rounded-2xl cove-gradient text-white font-bold gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => {
                onStartChat?.(userId);
                setOpen(false);
              }}
            >
              <MessageSquare className="w-5 h-5" />
              Написать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}