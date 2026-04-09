
"use client";

import * as React from "react";
import { Phone, Video, Info, Send, Paperclip, Smile, Image as ImageIcon, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";

const DUMMY_MESSAGES = [
  { id: "1", sender: "Алексей Иванов", content: "Привет! Ты видел обновление Arbogram?", time: "9:00", isMe: false },
  { id: "2", sender: "Я", content: "Да, теперь интерфейс стал чище.", time: "9:05", isMe: true },
  { id: "3", sender: "Алексей Иванов", content: "Согласен. И работает быстрее.", time: "9:10", isMe: false },
  { id: "4", sender: "Я", content: "Адаптив под телефоны тоже радует.", time: "9:15", isMe: true },
];

export function ChatWindow({ chatId }: { chatId: string }) {
  const [message, setMessage] = React.useState("");
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" asChild className="mr-1">
              <Link href="/chat">
                <ChevronLeft className="w-6 h-6 text-accent" />
              </Link>
            </Button>
          )}
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={`https://picsum.photos/seed/user${chatId}/200/200`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm">Собеседник {chatId}</h2>
            <p className="text-[10px] text-green-500 font-medium">В сети</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent hidden sm:flex">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent hidden sm:flex">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {DUMMY_MESSAGES.map((msg) => (
            <div key={msg.id} className={cn(
              "flex flex-col max-w-[85%] sm:max-w-[80%]",
              msg.isMe ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                msg.isMe 
                  ? "bg-accent text-white rounded-tr-none" 
                  : "bg-white text-foreground rounded-tl-none border border-primary/10"
              )}>
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-white/50 backdrop-blur-md border-t">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
              <Paperclip className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <Input 
              placeholder="Сообщение..." 
              className="pr-10 bg-background border-none rounded-full focus-visible:ring-primary shadow-inner"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && message.trim()) {
                  setMessage("");
                }
              }}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:text-accent"
            >
              <Smile className="w-5 h-5" />
            </Button>
          </div>
          <Button 
            className="rounded-full bg-accent hover:bg-accent/90 shadow-md text-white px-4 sm:px-6"
            onClick={() => message.trim() && setMessage("")}
          >
            <Send className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Отправить</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
