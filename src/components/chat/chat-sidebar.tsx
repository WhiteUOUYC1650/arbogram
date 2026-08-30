"use client";

import * as React from "react";
import { Search, Globe, LogOut, Settings as SettingsIcon, Pencil, Loader2, Info, ChevronRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useAuth, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, addDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { CreateChatDialog } from "./create-chat-dialog";
import { StoriesBar } from "@/components/stories/stories-bar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { translations, Language } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";

interface ChatSidebarProps {
  activeChatId?: string;
  onChatSelect: (id: string) => void;
}

export function ChatSidebar({ activeChatId, onChatSelect }: ChatSidebarProps) {
  const [lang, setLang] = React.useState<Language>('ru');
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();

  React.useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  const userRef = useMemoFirebase(() => (db && user ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);
  const isAdmin = userData?.username === "@nexus90kyt" || userData?.username === "@white";

  const myChatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );
  }, [db, user?.uid]);

  const { data: myChats, loading: chatsLoading } = useCollection(myChatsQuery);

  const sortedChats = React.useMemo(() => {
    if (!myChats) return [];
    return [...myChats].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  }, [myChats]);

  const handleOpenGlobalChat = async () => {
    if (!db || !user) return;
    try {
      const q = query(collection(db, "chats"), where("isPublic", "==", true), where("name", "==", "Общий чат"));
      const snap = await getDocs(q);
      let globalChatId;
      if (!snap.empty) {
        const chat = snap.docs[0];
        globalChatId = chat.id;
        if (!chat.data().participants.includes(user.uid)) {
          await updateDoc(doc(db, "chats", globalChatId), { participants: arrayUnion(user.uid) });
        }
      } else {
        const newChat = await addDoc(collection(db, "chats"), {
          name: "Общий чат",
          isPublic: true,
          type: "group",
          participants: [user.uid],
          lastMessage: "Добро пожаловать в Общий чат!",
          lastMessageTime: Date.now(),
          createdAt: serverTimestamp()
        });
        globalChatId = newChat.id;
      }
      onChatSelect(globalChatId);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar/30 relative">
      <div className="p-4 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArbogramIcon className="w-10 h-10 shadow-md" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold font-headline text-primary leading-none">CoveChat</h1>
              <span className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">{t.messenger}</span>
            </div>
          </div>
          <div className="flex gap-0.5">
            {isAdmin && (
              <Button variant="ghost" size="icon" asChild className="rounded-full h-9 w-9 text-destructive">
                <Link href="/admin"><ShieldAlert className="w-5 h-5" /></Link>
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Info className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArbogramIcon className="w-6 h-6 rounded-lg" />
                    {t.whatsNew}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{t.rebooting}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.v1_1_desc}</p>
                  </div>
                  <ul className="space-y-2">
                    {['Reactions & Replies', 'Admin Panel', 'User Blocking', 'Chat Deletion'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                        <ChevronRight className="w-3 h-3 text-primary" /> {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[9px] text-center text-muted-foreground pt-2">CoveChat • 2026 • Build 1.1.24</p>
                </div>
              </DialogContent>
            </Dialog>
            <SettingsDialog>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><SettingsIcon className="w-5 h-5 text-muted-foreground" /></Button>
            </SettingsDialog>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => auth && signOut(auth)}><LogOut className="w-4 h-4 text-muted-foreground/60" /></Button>
          </div>
        </div>
      </div>

      <StoriesBar onStartChat={onChatSelect} />

      <ScrollArea className="flex-1">
        <div className="px-2 pb-20 space-y-1">
          <div 
            onClick={handleOpenGlobalChat}
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:bg-white/40 dark:hover:bg-black/20 mb-1",
              activeChatId === "global" ? "bg-white dark:bg-white/10 shadow-sm" : "bg-accent/5 border border-accent/10"
            )}
          >
            <div className="w-12 h-12 rounded-full cove-gradient flex items-center justify-center shrink-0 border-2 border-white shadow-sm"><Globe className="w-6 h-6 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">Общий чат</p>
                <span className="text-[10px] text-accent font-bold uppercase">PUBLIC</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">Пиши и общайся со всеми!</p>
            </div>
          </div>

          {chatsLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-2 opacity-50"><Loader2 className="w-6 h-6 animate-spin text-primary" /><p className="text-[10px] font-bold uppercase">Загрузка...</p></div>
          ) : sortedChats.map((chat: any) => (
            <ChatItem key={chat.id} chat={chat} user={user} isActive={activeChatId === chat.id} onSelect={() => onChatSelect(chat.id)} />
          ))}
        </div>
      </ScrollArea>

      <div className="absolute bottom-6 right-6 z-20">
        <CreateChatDialog onChatCreated={onChatSelect}>
          <Button className="w-14 h-14 rounded-full cove-gradient shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center p-0"><Pencil className="w-6 h-6 text-white" /></Button>
        </CreateChatDialog>
      </div>
    </div>
  );
}

function ChatItem({ chat, user, isActive, onSelect }: { chat: any; user: any; isActive: boolean; onSelect: () => void }) {
  const db = useFirestore();
  let displayName = chat.name || "Группа";
  let targetId = chat.id;

  if (chat.type === 'individual' && user) {
    const otherId = chat.participants.find((p: string) => p !== user.uid);
    if (otherId && chat.metadata?.[otherId]) {
      displayName = chat.metadata[otherId].displayName;
      targetId = otherId;
    }
  }

  const userRef = useMemoFirebase(() => (db && targetId !== chat.id ? doc(db, "users", targetId) : null), [db, targetId, chat.id]);
  const { data: targetUserData } = useDoc(userRef);

  return (
    <div 
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:bg-white/40 dark:hover:bg-black/20 animate-in fade-in duration-300",
        isActive && "bg-white dark:bg-white/10 shadow-sm ring-1 ring-primary/10"
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar userId={targetId} fallback={displayName} className="w-12 h-12 border-2 border-primary/20" />
        {targetUserData?.status === 'online' && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm truncate text-foreground">{displayName}</p>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
            {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ""}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "Нет сообщений"}</p>
      </div>
    </div>
  );
}