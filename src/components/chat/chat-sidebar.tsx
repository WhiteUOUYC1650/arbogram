
"use client";

import * as React from "react";
import { Search, Globe, LogOut, Settings as SettingsIcon, Pencil, Loader2, Info, ChevronRight, ShieldAlert, User as UserIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useAuth, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, setDoc, getDoc, serverTimestamp, limit, orderBy } from "firebase/firestore";
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
import { UserProfileDialog } from "./user-profile-dialog";

const GLOBAL_CHAT_ID = "p7gSC3o9OxVezsjDbrFq";

interface ChatSidebarProps {
  activeChatId?: string;
  onChatSelect: (id: string) => void;
}

export function ChatSidebar({ activeChatId, onChatSelect }: ChatSidebarProps) {
  const [lang, setLang] = React.useState<Language>('ru');
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<{ users: any[], chats: any[] }>({ users: [], chats: [] });
  const [isSearching, setIsSearching] = React.useState(false);
  
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
  const isAdmin = userData?.username?.toLowerCase() === "@nexus90kyt" || userData?.username?.toLowerCase() === "@white";

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
    return [...myChats]
      .filter(c => c.id !== GLOBAL_CHAT_ID)
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  }, [myChats]);

  const handleGlobalSearch = async (val: string) => {
    setSearchTerm(val);
    if (!db || val.length < 2) {
      setSearchResults({ users: [], chats: [] });
      return;
    }

    setIsSearching(true);
    try {
      const userQ = query(
        collection(db, "users"),
        where("username", ">=", val.startsWith("@") ? val : "@" + val),
        where("username", "<=", (val.startsWith("@") ? val : "@" + val) + "\uf8ff"),
        limit(5)
      );
      
      const chatQ = query(
        collection(db, "chats"),
        where("isPublic", "==", true),
        where("name", ">=", val),
        where("name", "<=", val + "\uf8ff"),
        limit(5)
      );

      const [userSnap, chatSnap] = await Promise.all([getDocs(userQ), getDocs(chatQ)]);
      
      setSearchResults({
        users: userSnap.docs.map(d => ({ ...d.data(), id: d.id })).filter(u => u.uid !== user?.uid),
        chats: chatSnap.docs.map(d => ({ ...d.data(), id: d.id }))
      });
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenGlobalChat = async () => {
    if (!db || !user) return;
    try {
      const globalChatRef = doc(db, "chats", GLOBAL_CHAT_ID);
      const snap = await getDoc(globalChatRef);
      
      if (snap.exists()) {
        const data = snap.data();
        if (!data.participants.includes(user.uid)) {
          await updateDoc(globalChatRef, { participants: arrayUnion(user.uid) });
        }
      }
      onChatSelect(GLOBAL_CHAT_ID);
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
              <span className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">MESSENGER</span>
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
              <DialogContent className="rounded-[2rem] max-w-sm border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArbogramIcon className="w-6 h-6 rounded-lg" />
                    {t.whatsNew}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Redirection v1.1.2.2</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Финальная оптимизация интерфейса и системы восстановления.
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {[
                      { icon: "🖼️", text: "Аватарки в окне сообщений" },
                      { icon: "⚙️", text: "Расширенные настройки профиля" },
                      { icon: "🔐", text: "Вход через ПИН при утере пароля" },
                      { icon: "🎨", text: "Стикеры и GIF (до 10 МБ)" },
                      { icon: "📦", text: "Система чанкинга документов" }
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-[11px] font-medium text-foreground bg-muted/30 p-2 rounded-xl">
                        <span className="text-base">{item.icon}</span> {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
            <SettingsDialog>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9"><SettingsIcon className="w-5 h-5 text-muted-foreground" /></Button>
            </SettingsDialog>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={() => auth && signOut(auth)}><LogOut className="w-4 h-4 text-muted-foreground/60" /></Button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder={t.search} 
            value={searchTerm}
            onChange={(e) => handleGlobalSearch(e.target.value)}
            className="h-10 pl-10 rounded-2xl bg-white/50 dark:bg-black/20 border-none focus-visible:ring-primary shadow-sm" 
          />
        </div>
      </div>

      {!searchTerm && <StoriesBar onStartChat={onChatSelect} />}

      <ScrollArea className="flex-1">
        <div className="px-2 pb-20 space-y-1">
          {searchTerm ? (
            <div className="space-y-4 p-2 animate-in fade-in duration-300">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center p-8 gap-2 opacity-50"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  {searchResults.users.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2 tracking-widest">Люди</p>
                      {searchResults.users.map(u => (
                        <UserProfileDialog key={u.id} userId={u.uid} onStartChat={onChatSelect}>
                          <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-black/20 cursor-pointer">
                            <UserAvatar userId={u.uid} fallback={u.displayName} className="w-10 h-10" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold truncate">{u.displayName}</p>
                              <p className="text-xs text-primary font-mono truncate">{u.username}</p>
                            </div>
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </UserProfileDialog>
                      ))}
                    </div>
                  )}
                  {searchResults.chats.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2 tracking-widest">Каналы и Группы</p>
                      {searchResults.chats.map(c => (
                        <div key={c.id} onClick={() => onChatSelect(c.id)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-black/20 cursor-pointer">
                          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><Globe className="w-5 h-5" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{c.type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div 
                onClick={handleOpenGlobalChat}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:bg-white/40 dark:hover:bg-black/20 mb-1",
                  activeChatId === GLOBAL_CHAT_ID ? "bg-white dark:bg-white/10 shadow-sm" : "bg-accent/5 border border-accent/10"
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
                <div className="flex flex-col items-center justify-center p-8 gap-2 opacity-50"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : sortedChats.map((chat: any) => (
                <ChatItem key={chat.id} chat={chat} user={user} isActive={activeChatId === chat.id} onSelect={() => onChatSelect(chat.id)} />
              ))}
            </>
          )}
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

  const userRef = useMemoFirebase(() => (db && targetId !== chat.id && targetId !== GLOBAL_CHAT_ID ? doc(db, "users", targetId) : null), [db, targetId, chat.id]);
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
        {chat.id === GLOBAL_CHAT_ID ? (
          <div className="w-12 h-12 rounded-full cove-gradient flex items-center justify-center border-2 border-white shadow-sm"><Globe className="w-6 h-6 text-white" /></div>
        ) : (
          <UserAvatar userId={targetId} fallback={displayName} className="w-12 h-12 border-2 border-primary/20" />
        )}
        {targetUserData?.status === 'online' && chat.id !== GLOBAL_CHAT_ID && (
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
