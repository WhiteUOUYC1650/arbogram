
"use client";

import * as React from "react";
import { Search, Plus, MessageSquare, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DUMMY_CHATS = [
  { id: "1", name: "Общий чат", lastMessage: "Привет всем!", time: "10:30", type: "group", avatar: "https://picsum.photos/seed/chat1/200/200" },
  { id: "2", name: "Алексей Иванов", lastMessage: "Договорились, до завтра", time: "9:15", type: "individual", avatar: "https://picsum.photos/seed/user1/200/200" },
  { id: "3", name: "Марина Сергеева", lastMessage: "Отправила документ", time: "Вчера", type: "individual", avatar: "https://picsum.photos/seed/user2/200/200" },
  { id: "4", name: "Рабочая группа", lastMessage: "Встреча в 17:00", time: "Вчера", type: "group", avatar: "https://picsum.photos/seed/group1/200/200" },
  { id: "5", name: "Дмитрий Петров", lastMessage: "Спасибо!", time: "Пн", type: "individual", avatar: "https://picsum.photos/seed/user3/200/200" },
];

export function ChatSidebar() {
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");

  const filteredChats = DUMMY_CHATS.filter(chat => 
    chat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/chat" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold font-headline text-accent flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <span className="text-white text-xs">A</span>
              </div>
              Arbogram
            </h1>
          </Link>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Plus className="w-5 h-5 text-accent" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск..." 
            className="pl-9 bg-background/50 border-none focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {filteredChats.map((chat) => {
            const isActive = pathname === `/chat/${chat.id}`;
            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer hover:bg-white/40",
                  isActive && "bg-white shadow-sm"
                )}>
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarImage src={chat.avatar} />
                      <AvatarFallback>{chat.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate text-foreground">{chat.name}</p>
                      <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {chat.type === "group" ? <Users className="w-3 h-3 text-muted-foreground" /> : <MessageSquare className="w-3 h-3 text-muted-foreground" />}
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
