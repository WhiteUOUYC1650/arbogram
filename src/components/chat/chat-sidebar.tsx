
"use client";

import * as React from "react";
import { Search, Plus, MessageSquare, Users, LogOut, Megaphone, Globe, Settings as SettingsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollection, useFirestore, useAuth, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { CreateChatDialog } from "./create-chat-dialog";
import { StoriesBar } from "@/components/stories/stories-bar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { UserAvatar } from "@/components/user-avatar";

export function ChatSidebar() {
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );
  }, [db, user?.uid]);

  const { data: chats } = useCollection(chatsQuery);

  const filteredChats = chats?.filter(chat => {
    const chatName = chat.type === 'individual' && user 
      ? chat.metadata?.[chat.participants.find(p => p !== user.uid)]?.displayName
      : chat.name;
    return (chatName || "Чат").toLowerCase().includes(search.toLowerCase());
  }) || [];

  return (
    <div className="flex flex-col h-full bg-sidebar/30">
      <div className="p-4 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/chat" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold font-headline text-accent flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <span className="text-white text-xs">A</span>
              </div>
              Arbogram
            </h1>
          </Link>
          <div className="flex gap-1">
            <SettingsDialog>
              <Button variant="ghost" size="icon" className="rounded-full">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              </Button>
            </SettingsDialog>
            <CreateChatDialog>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Plus className="w-5 h-5 text-accent" />
              </Button>
            </CreateChatDialog>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => auth && signOut(auth)}>
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск чатов..." 
            className="pl-9 bg-background/50 border-none focus-visible:ring-primary rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <StoriesBar />

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {filteredChats.map((chat) => {
            const isActive = pathname === `/chat/${chat.id}`;
            let displayName = chat.name || "Группа";
            let targetId = chat.id; // Для групп/каналов

            if (chat.type === 'individual' && user) {
              const otherId = chat.participants.find(p => p !== user.uid);
              if (otherId && chat.metadata?.[otherId]) {
                displayName = chat.metadata[otherId].displayName;
                targetId = otherId;
              }
            }
            
            const Icon = chat.type === "group" ? Users : chat.type === "channel" ? Megaphone : MessageSquare;
            
            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:bg-white/40",
                  isActive && "bg-white shadow-sm ring-1 ring-primary/10"
                )}>
                  <UserAvatar 
                    userId={targetId} 
                    fallback={displayName} 
                    className="w-12 h-12 border-2 border-primary/20 shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">{displayName}</p>
                        {chat.isPublic && <Globe className="w-3 h-3 text-accent shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleString('ru-RU', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
