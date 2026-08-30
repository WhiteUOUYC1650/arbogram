"use client";

import * as React from "react";
import { 
  Send, Paperclip, X, Loader2, 
  MoreVertical, Trash2, Copy, 
  Clock, Reply, Smile, ShieldBan, LogOut, CheckCheck, Download, Globe, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { 
  collection, query, orderBy, addDoc, doc, updateDoc, 
  deleteDoc, arrayUnion, arrayRemove, getDoc, getDocs, where, limit 
} from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translations, Language } from "@/lib/i18n";

const GLOBAL_CHAT_ID = "p7gSC3o9OxVezsjDbrFq";
const MAX_IMAGES = 10;

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
  onStartDirectChat?: (targetUserId: string) => void;
}

export function ChatWindow({ chatId, onBack, onStartDirectChat }: ChatWindowProps) {
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const [replyTo, setReplyTo] = React.useState<any>(null);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  React.useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const chatRef = useMemoFirebase(() => db ? doc(db, "chats", chatId) : null, [db, chatId]);
  const { data: chatData } = useDoc(chatRef);
  
  const otherId = React.useMemo(() => {
    if (!chatData || !user || chatData.type !== 'individual') return "";
    return chatData.participants?.find((p: string) => p !== user.uid) || "";
  }, [chatData, user]);

  const otherUserRef = useMemoFirebase(() => (db && otherId ? doc(db, "users", otherId) : null), [db, otherId]);
  const { data: otherUserData } = useDoc(otherUserRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  }, [db, chatId]);

  const { data: messages } = useCollection(messagesQuery);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMentionClick = async (username: string) => {
    if (!db) return;
    const formattedUsername = username.startsWith("@") ? username : "@" + username;
    try {
      const q = query(collection(db, "users"), where("username", "==", formattedUsername.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        onStartDirectChat?.(snap.docs[0].id);
      } else {
        toast({ title: "Пользователь не найден", description: formattedUsername });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderTextWithMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); handleMentionClick(part); }}
            className="text-white bg-white/20 px-1 rounded-md cursor-pointer hover:bg-white/40 transition-colors font-bold"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > MAX_IMAGES) {
      toast({ variant: "destructive", title: t.error, description: `Максимум ${MAX_IMAGES} изображений.` });
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setSelectedImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (options: { audioUrl?: string; duration?: number } = {}) => {
    const { audioUrl, duration } = options;
    const hasText = message.trim().length > 0;
    const hasImages = selectedImages.length > 0;
    
    if (!hasText && !hasImages && !audioUrl) return;
    if (!db || !user) return;

    if (chatData?.type === 'individual' && otherUserData?.blockedUsers?.includes(user.uid)) {
      toast({ variant: "destructive", title: t.error, description: "Вы заблокированы этим пользователем." });
      return;
    }

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "User",
      timestamp: Date.now(),
      type: audioUrl ? "audio" : (hasImages ? "image" : "text"),
      text: message.trim() || null,
      imageUrls: hasImages ? selectedImages : null,
      audioUrl: audioUrl || null,
      duration: duration || null,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || (replyTo.imageUrls ? '📷 Фото' : '🎤 Голос'), senderName: replyTo.senderName } : null,
      reactions: {}
    };

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), msgData);
      if (chatRef) {
        let lastMsg = msgData.text;
        if (audioUrl) lastMsg = "🎤 Голосовое";
        else if (hasImages) lastMsg = hasText ? `📷 ${msgData.text}` : "📷 Фото";
        
        await updateDoc(chatRef, { 
          lastMessage: lastMsg, 
          lastMessageTime: Date.now() 
        });
      }
      setMessage("");
      setSelectedImages([]);
      setReplyTo(null);
    } catch (e) {
      toast({ variant: "destructive", title: t.error, description: "Не удалось отправить." });
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!db || !user) return;
    const msgRef = doc(db, "chats", chatId, "messages", msgId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: arrayUnion(user.uid)
    });
  };

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: t.copy });
  };

  const handleSaveImage = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  let chatName = chatData?.name || "Chat";
  let avatarTargetId = chatId; 

  if (chatData?.type === 'individual' && otherId) {
    if (chatData.metadata?.[otherId]) {
      chatName = chatData.metadata[otherId].displayName;
      avatarTargetId = otherId;
    }
  }

  const isOnline = chatData?.type === 'individual' && otherUserData?.status === 'online';
  const headerStatus = chatData?.isPublic || chatId === GLOBAL_CHAT_ID
    ? `${chatData?.participants?.length || 0} ${t.members}`
    : (isOnline ? t.online : t.offline);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={onBack}><X className="w-5 h-5" /></Button>}
          <div 
            className={cn(
              "flex items-center gap-3",
              chatId !== GLOBAL_CHAT_ID && chatData?.type === 'individual' && "cursor-pointer hover:opacity-80 transition-opacity"
            )}
            onClick={() => {
              if (chatId !== GLOBAL_CHAT_ID && chatData?.type === 'individual' && otherId) {
                onStartDirectChat?.(otherId);
              }
            }}
          >
            {chatId === GLOBAL_CHAT_ID ? (
               <div className="w-10 h-10 rounded-full cove-gradient flex items-center justify-center border-2 border-primary/20 shadow-sm"><Globe className="w-6 h-6 text-white" /></div>
            ) : (
              <UserAvatar userId={avatarTargetId} fallback={chatName} className="w-10 h-10 border-2 border-primary/20" />
            )}
            <div className="min-w-0">
              <h2 className="font-semibold text-sm leading-tight truncate">{chatName}</h2>
              <p className={cn("text-[10px] font-bold uppercase opacity-80", isOnline || chatId === GLOBAL_CHAT_ID ? "text-primary" : "text-muted-foreground")}>
                {headerStatus}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl" align="end">
              {chatData?.type === 'individual' && (
                <>
                  <DropdownMenuItem onClick={async () => {
                    if (!db || !user || !otherId) return;
                    await updateDoc(doc(db, "users", user.uid), { blockedUsers: arrayUnion(otherId) });
                    toast({ title: "Заблокирован" });
                  }} className="text-destructive"><ShieldBan className="w-4 h-4 mr-2" />{t.block}</DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    if (!db || !chatRef) return;
                    await deleteDoc(chatRef);
                    onBack?.();
                  }} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />{t.deleteChat}</DropdownMenuItem>
                </>
              )}
              {chatData?.type !== 'individual' && chatId !== GLOBAL_CHAT_ID && (
                <DropdownMenuItem onClick={async () => {
                  if (!db || !user || !chatRef) return;
                  await updateDoc(chatRef, { participants: arrayRemove(user.uid) });
                  onBack?.();
                }} className="text-destructive"><LogOut className="w-4 h-4 mr-2" />{t.leave}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-sidebar/5">
        <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          {messages?.map((msg, idx) => {
            const isMe = msg.senderId === user?.uid;

            return (
              <div key={msg.id} className={cn("flex items-start gap-2 max-w-[85%] group/msg", isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row")}>
                {!isMe && (
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity shrink-0" 
                    onClick={() => onStartDirectChat?.(msg.senderId)}
                  >
                    <UserAvatar userId={msg.senderId} fallback={msg.senderName} className="w-8 h-8 mt-1" />
                  </div>
                )}
                
                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1 group">
                    {isMe && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-full"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-xl" align="start">
                          <DropdownMenuItem onClick={() => setReplyTo(msg)}><Reply className="w-4 h-4 mr-2" />{t.reply}</DropdownMenuItem>
                          {msg.text && <DropdownMenuItem onClick={() => handleCopy(msg.text)}><Copy className="w-4 h-4 mr-2" />{t.copy}</DropdownMenuItem>}
                          {msg.imageUrls && <DropdownMenuItem onClick={() => handleSaveImage(msg.imageUrls[0])}><Download className="w-4 h-4 mr-2" />{t.save}</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => deleteDoc(doc(db!, "chats", chatId, "messages", msg.id))} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />{t.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm relative min-w-[60px]", 
                      isMe ? "cove-gradient text-white rounded-tr-none" : "bg-white dark:bg-zinc-800 text-foreground rounded-tl-none border"
                    )}>
                      {msg.replyTo && (
                        <div 
                          className="mb-2 p-2 rounded-lg bg-black/10 border-l-2 border-primary text-[10px] opacity-80 cursor-pointer"
                          onClick={() => {
                            // Логика скролла к оригинальному сообщению может быть добавлена здесь
                          }}
                        >
                          <p className="font-bold">{msg.replyTo.senderName}</p>
                          <p className="truncate">{msg.replyTo.text}</p>
                        </div>
                      )}
                      
                      {msg.imageUrls && (
                        <div className={cn(
                          "grid gap-1 mb-2",
                          msg.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                          msg.imageUrls.length >= 3 ? "grid-cols-3" : ""
                        )}>
                          {msg.imageUrls.map((url: string, i: number) => (
                            <img 
                              key={i}
                              src={url} 
                              className="w-full h-24 sm:h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                              alt="Chat content" 
                              onClick={() => handleSaveImage(url)}
                            />
                          ))}
                        </div>
                      )}

                      {msg.audioUrl && (
                        <div className="flex items-center gap-3 py-1 min-w-[180px]">
                          <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-white/70" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                              <div className="h-full bg-white w-1/3" />
                            </div>
                            <span className="text-[11px] font-bold mt-1.5 opacity-90">{msg.duration ? `${Math.floor(msg.duration / 60)}:${(msg.duration % 60).toString().padStart(2, '0')}` : "0:00"}</span>
                          </div>
                        </div>
                      )}

                      {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{renderTextWithMentions(msg.text)}</p>}
                      
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.reactions && Object.entries(msg.reactions).map(([emoji, uids]: any) => (
                          <div key={emoji} className="px-1.5 py-0.5 bg-black/10 rounded-full text-[10px] flex items-center gap-1">
                            {emoji} {uids.length}
                          </div>
                        ))}
                      </div>
                    </div>

                    {!isMe && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="rounded-xl" align="end">
                            <DropdownMenuItem onClick={() => setReplyTo(msg)}><Reply className="w-4 h-4 mr-2" />{t.reply}</DropdownMenuItem>
                            {msg.text && <DropdownMenuItem onClick={() => handleCopy(msg.text)}><Copy className="w-4 h-4 mr-2" />{t.copy}</DropdownMenuItem>}
                            {msg.imageUrls && <DropdownMenuItem onClick={() => handleSaveImage(msg.imageUrls[0])}><Download className="w-4 h-4 mr-2" />{t.save}</DropdownMenuItem>}
                            <div className="flex p-1 border-t mt-1 gap-1">
                              {['❤️', '👍', '😂', '🔥'].map(emoji => (
                                <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 transition-transform p-1">{emoji}</button>
                              ))}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <CheckCheck className="w-3 h-3 text-primary" />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Previews and Reply Context */}
      <div className="shrink-0">
        {replyTo && (
          <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-4 h-4 text-primary" />
              <div className="text-[10px] truncate">
                <p className="font-bold">{replyTo.senderName}</p>
                <p className="text-muted-foreground truncate">{replyTo.text || (replyTo.imageUrls ? '📷 Фото' : '🎤 Голос')}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
          </div>
        )}

        {selectedImages.length > 0 && (
          <div className="px-4 py-3 bg-muted/20 border-t flex flex-wrap gap-2 animate-in slide-in-from-bottom duration-200">
            {selectedImages.map((img, i) => (
              <div key={i} className="relative w-16 h-16 group">
                <img src={img} className="w-full h-full object-cover rounded-lg border shadow-sm" alt="Selected" />
                <button 
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {selectedImages.length < MAX_IMAGES && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-primary/5 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-[8px] font-bold">{selectedImages.length}/{MAX_IMAGES}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 dark:bg-black/40 backdrop-blur-md border-t shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange} 
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground" 
            onClick={() => fileInputRef.current?.click()}
            disabled={selectedImages.length >= MAX_IMAGES}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input 
            placeholder={selectedImages.length > 0 ? "Добавьте подпись..." : t.message} 
            className="rounded-full bg-background border-none h-11" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          />
          <Button className="rounded-full cove-gradient text-white h-11 w-11 p-0 shadow-lg shadow-primary/20" onClick={() => handleSend()} disabled={isSending}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}