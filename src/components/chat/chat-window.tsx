
"use client";

import * as React from "react";
import { Phone, Info, Send, Paperclip, Smile, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, addDoc, doc, updateDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function ChatWindow({ chatId }: { chatId: string }) {
  const [message, setMessage] = React.useState("");
  const isMobile = useIsMobile();
  const db = useFirestore();
  const { user } = useUser();

  const chatRef = useMemoFirebase(() => db ? doc(db, "chats", chatId) : null, [db, chatId]);
  const { data: chatData } = useDoc(chatRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
  }, [db, chatId]);

  const { data: messages } = useCollection(messagesQuery);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !db || !user) return;

    const msgData = {
      senderId: user.uid,
      senderName: user.displayName || "Пользователь",
      text: message,
      timestamp: Date.now()
    };

    const currentMessage = message;
    setMessage("");

    addDoc(collection(db, "chats", chatId, "messages"), msgData)
      .catch(async (e) => {
        const error = new FirestorePermissionError({
          path: `chats/${chatId}/messages`,
          operation: "create",
          requestResourceData: msgData
        });
        errorEmitter.emit("permission-error", error);
        setMessage(currentMessage);
      });

    if (chatRef) {
      updateDoc(chatRef, {
        lastMessage: currentMessage,
        lastMessageTime: Date.now()
      }).catch(() => {});
    }
  };

  const chatName = chatData?.name || `Чат ${chatId.substring(0, 4)}`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" asChild className="mr-1">
              <Link href="/chat">
                <ChevronLeft className="w-6 h-6 text-accent" />
              </Link>
            </Button>
          )}
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={`https://picsum.photos/seed/${chatId}/200/200`} />
            <AvatarFallback>{chatName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-sm">{chatName}</h2>
            <p className="text-[10px] text-accent font-medium">Онлайн</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent hidden sm:flex">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {messages?.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[75%]",
                isMe ? "ml-auto items-end" : "mr-auto items-start"
              )}>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all",
                  isMe 
                    ? "bg-accent text-white rounded-tr-none" 
                    : "bg-white text-foreground rounded-tl-none border border-primary/10"
                )}>
                  {!isMe && <p className="text-[9px] font-bold opacity-70 mb-1">{msg.senderName}</p>}
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Input 
              placeholder="Введите сообщение..." 
              className="pr-10 bg-background border-none rounded-full focus-visible:ring-primary shadow-inner h-11"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
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
            className="rounded-full bg-accent hover:bg-accent/90 shadow-md text-white px-4 sm:px-6 h-11"
            onClick={handleSend}
            disabled={!message.trim()}
          >
            <Send className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Отправить</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
