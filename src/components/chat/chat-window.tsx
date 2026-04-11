
"use client";

import * as React from "react";
import { Info, Send, Paperclip, Smile, Megaphone, X, Loader2, Image as ImageIcon, MoreVertical, Trash2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChatWindow({ chatId }: { chatId: string }) {
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; 
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSend = (imageUrl?: string) => {
    if ((!message.trim() && !imageUrl) || !db || !user) return;

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "Пользователь",
      text: message.trim() || null,
      timestamp: Date.now()
    };
    if (imageUrl) msgData.imageUrl = imageUrl;

    const currentMessage = message;
    setMessage("");

    addDoc(collection(db, "chats", chatId, "messages"), msgData)
      .then(() => {
        if (chatRef) {
          updateDoc(chatRef, {
            lastMessage: imageUrl ? "📷 Фото" : currentMessage,
            lastMessageTime: Date.now()
          }).catch(() => {});
        }
      })
      .catch(async (e) => {
        const error = new FirestorePermissionError({
          path: `chats/${chatId}/messages`,
          operation: "create",
          requestResourceData: msgData
        });
        errorEmitter.emit("permission-error", error);
        setMessage(currentMessage);
      })
      .finally(() => setIsSending(false));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Ошибка", description: "Пожалуйста, выберите изображение." });
      return;
    }

    try {
      const base64 = await compressImage(file);
      handleSend(base64);
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось загрузить фото." });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
      toast({ title: "Сообщение удалено" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: "Недостаточно прав для удаления." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Скопировано в буфер обмена" });
  };

  const saveImage = (base64: string) => {
    const link = document.createElement("a");
    link.href = base64;
    link.download = `arbogram_image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Изображение сохранено" });
  };

  let chatName = chatData?.name || "Чат";
  let avatarTargetId = chatId; 
  let subText = "В сети";

  if (chatData?.type === 'individual' && user) {
    const otherId = chatData.participants?.find((p: string) => p !== user.uid);
    if (otherId && chatData.metadata?.[otherId]) {
      chatName = chatData.metadata[otherId].displayName;
      avatarTargetId = otherId;
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
          
          <UserAvatar userId={avatarTargetId} fallback={chatName} className="w-10 h-10 border-2 border-primary/20 shrink-0" />
          
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
            const isOwner = chatData?.ownerId === user?.uid;
            const canDelete = isMe || isOwner;
            
            return (
              <div key={msg.id} className={cn(
                "flex flex-col group/msg max-w-[85%] sm:max-w-[75%]",
                alignLeft ? "mr-auto items-start" : "ml-auto items-end"
              )}>
                <div className="flex items-start gap-1 w-full">
                  {!alignLeft && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <MoreVertical className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        {msg.text && (
                          <DropdownMenuItem onClick={() => copyToClipboard(msg.text!)} className="gap-2 cursor-pointer">
                            <Copy className="w-4 h-4" /> <span>Копировать</span>
                          </DropdownMenuItem>
                        )}
                        {msg.imageUrl && (
                          <DropdownMenuItem onClick={() => saveImage(msg.imageUrl!)} className="gap-2 cursor-pointer">
                            <Download className="w-4 h-4" /> <span>Сохранить</span>
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4" /> <span>Удалить</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  <div className={cn(
                    "p-1 rounded-2xl text-sm shadow-sm transition-all overflow-hidden flex-1",
                    !alignLeft
                      ? "bg-accent text-white rounded-tr-none" 
                      : "bg-white text-foreground rounded-tl-none border border-primary/10"
                  )}>
                    {chatData?.type === 'group' && !isMe && (
                      <div className="flex items-center gap-2 mb-1 px-3 pt-2">
                        <UserAvatar userId={msg.senderId} fallback={msg.senderName} className="w-4 h-4 shrink-0" />
                        <p className="text-[9px] font-bold opacity-70">{msg.senderName}</p>
                      </div>
                    )}
                    {msg.imageUrl && (
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared photo" 
                        className="w-full max-h-[300px] object-cover rounded-xl cursor-pointer"
                        onClick={() => saveImage(msg.imageUrl!)}
                      />
                    )}
                    {msg.text && (
                      <div className={cn("px-3 py-2", msg.imageUrl && "pt-1")}>
                        {msg.text}
                      </div>
                    )}
                  </div>

                  {alignLeft && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <MoreVertical className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl">
                        {msg.text && (
                          <DropdownMenuItem onClick={() => copyToClipboard(msg.text!)} className="gap-2 cursor-pointer">
                            <Copy className="w-4 h-4" /> <span>Копировать</span>
                          </DropdownMenuItem>
                        )}
                        {msg.imageUrl && (
                          <DropdownMenuItem onClick={() => saveImage(msg.imageUrl!)} className="gap-2 cursor-pointer">
                            <Download className="w-4 h-4" /> <span>Сохранить</span>
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4" /> <span>Удалить</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-muted-foreground hover:text-accent shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
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
              onClick={() => handleSend()}
              disabled={(!message.trim()) || isSending}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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

