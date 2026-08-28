
"use client";

import * as React from "react";
import { Search, Plus, MessageSquare, Users, LogOut, Megaphone, Globe, Settings as SettingsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useAuth, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { CreateChatDialog } from "./create-chat-dialog";
import { StoriesBar } from "@/components/stories/stories-bar";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { ArbogramIcon } from "@/components/arbogram-icon";

interface ChatSidebarProps {
  activeChatId?: string;
  onChatSelect: (id: string) => void;
}

export function ChatSidebar({ activeChatId, onChatSelect }: ChatSidebarProps) {
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
    return (chatName || "Chat").toLowerCase().includes(search.toLowerCase());
  }) || [];

  return (
    <div className="flex flex-col h-full bg-sidebar/30">
      {/* Шапка сайдбара с логотипом и названием */}
      <div className="p-4 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArbogramIcon className="w-10 h-10 shadow-md" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold font-headline text-primary leading-none">CoveChat</h1>
              <span className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">Messenger</span>
            </div>
          </div>
          <div className="flex gap-0.5">
            <SettingsDialog>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              </Button>
            </SettingsDialog>
            <CreateChatDialog onChatCreated={onChatSelect}>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <Plus className="w-5 h-5 text-primary" />
              </Button>
            </CreateChatDialog>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9" 
              onClick={() => auth && signOut(auth)}
            >
              <LogOut className="w-4 h-4 text-muted-foreground/60" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search Cove..." 
            className="pl-9 bg-background/50 border-none focus-visible:ring-primary rounded-xl h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <StoriesBar />

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const isActive = activeChatId === chat.id;
              let displayName = chat.name || "Group";
              let targetId = chat.id; 

              if (chat.type === 'individual' && user) {
                const otherId = chat.participants.find(p => p !== user.uid);
                if (otherId && chat.metadata?.[otherId]) {
                  displayName = chat.metadata[otherId].displayName;
                  targetId = otherId;
                }
              }
              
              const Icon = chat.type === "group" ? Users : chat.type === "channel" ? Megaphone : MessageSquare;
              
              return (
                <div 
                  key={chat.id} 
                  onClick={() => onChatSelect(chat.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:bg-white/40 dark:hover:bg-black/20",
                    isActive && "bg-white dark:bg-white/10 shadow-sm ring-1 ring-primary/10"
                  )}
                >
                  <UserAvatar 
                    userId={targetId} 
                    fallback={displayName} 
                    className="w-12 h-12 border-2 border-primary/20 shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">{displayName}</p>
                        {chat.isPublic && <Globe className="w-3 h-3 text-primary shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages"}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground">Empty Cove</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
