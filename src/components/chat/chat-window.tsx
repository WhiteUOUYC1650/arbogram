
"use client";

import * as React from "react";
import { Info, Send, Paperclip, Smile, ChevronLeft, Megaphone, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

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

  let chatName = chatData?.name || "Чат";
  let chatAvatar = chatData?.photoURL;
  let subText = "В сети";

  if (chatData?.type === 'individual' && user) {
    const otherId = chatData.participants?.find((p: string) => p !== user.uid);
    if (otherId && chatData.metadata?.[otherId]) {
      chatName = chatData.metadata[otherId].displayName;
      chatAvatar = chatData.metadata[otherId].photoURL;
    }
  } else if (chatData?.type === 'group') {
    const count = chatData.participants?.length || 0;
    const getRussianMemberSuffix = (c: number) => {
      if (c % 10 === 1 && c % 100 !== 11) return "участник";
      if ([2, 3, 4].includes(c % 10) && ![12, 13, 14].includes(c % 100)) return "участника";
      return "участников";
    };
    subText = `${count} ${getRussianMemberSuffix(count)}`;
  } else if (chatData?.type === 'channel') {
    subText = "Канал";
  }

  const canWrite = chatData?.type !== 'channel' || chatData?.ownerId === user?.uid;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-destructive transition-colors shrink-0"
            onClick={() => router.push('/chat')}
          >
            <X className="w-5 h-5" />
          </Button>
          
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            {chatAvatar && <AvatarImage src={chatAvatar} />}
            <AvatarFallback>{chatName[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate max-w-[150px] sm:max-w-none flex items-center gap-1">
              {chatName}
              {chatData?.type === 'channel' && <Megaphone className="w-3 h-3 text-accent" />}
            </h2>
            <p className="text-[10px] text-accent font-medium">{subText}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent">
            <Info className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 bg-sidebar/10">
        <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          {messages?.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            const alignLeft = chatData?.type === 'channel' || !isMe;
            
            return (
              <div key={msg.id} className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[75%]",
                alignLeft ? "mr-auto items-start" : "ml-auto items-end"
              )}>
                <div className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all",
                  !alignLeft
                    ? "bg-accent text-white rounded-tr-none" 
                    : "bg-white text-foreground rounded-tl-none border border-primary/10"
                )}>
                  {chatData?.type === 'group' && !isMe && (
                    <p className="text-[9px] font-bold opacity-70 mb-1">{msg.senderName}</p>
                  )}
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleString('ru-RU', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            );
          })}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>

      {canWrite ? (
        <div className="p-4 bg-white/80 backdrop-blur-md border-t shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-accent shrink-0">
              <Paperclip className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative min-w-0">
              <Input 
                placeholder={chatData?.type === 'channel' ? "Опубликовать в канале..." : "Введите сообщение..."}
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
              className="rounded-full bg-accent hover:bg-accent/90 shadow-md text-white px-4 h-11 shrink-0"
              onClick={handleSend}
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">{chatData?.type === 'channel' ? "Пост" : "Отправить"}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-sidebar/20 text-center border-t shrink-0">
          <p className="text-xs text-muted-foreground">В этом канале могут писать только администраторы.</p>
        </div>
      )}
    </div>
  );
}
