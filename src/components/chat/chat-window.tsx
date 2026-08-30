
"use client";

import * as React from "react";
import { 
  Send, Paperclip, X, Loader2, 
  MoreVertical, Trash2, Copy, 
  Clock, Reply, Smile, ShieldBan, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { 
  collection, query, orderBy, addDoc, doc, updateDoc, 
  deleteDoc, deleteField, arrayUnion, arrayRemove, getDoc 
} from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { translations, Language } from "@/lib/i18n";

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
  const { data: currentUserData } = useDoc(user && db ? doc(db, "users", user.uid) : null);

  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  }, [db, chatId]);

  const { data: messages } = useCollection(messagesQuery);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (options: { imageUrl?: string }) => {
    const { imageUrl } = options;
    if ((!message.trim() && !imageUrl) || !db || !user) return;

    // Check if blocked
    const otherId = chatData?.participants?.find((p: string) => p !== user.uid);
    if (chatData?.type === 'individual' && otherId) {
      // Logic for blocking would be checked here or in rules
    }

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "User",
      timestamp: Date.now(),
      type: imageUrl ? "image" : "text",
      text: message.trim() || null,
      imageUrl: imageUrl || null,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderName: replyTo.senderName } : null,
      reactions: {}
    };

    addDoc(collection(db, "chats", chatId, "messages"), msgData)
      .then(() => {
        if (chatRef) {
          updateDoc(chatRef, { 
            lastMessage: imageUrl ? "📷 Фото" : msgData.text, 
            lastMessageTime: Date.now() 
          }).catch(() => {});
        }
        setMessage("");
        setReplyTo(null);
      })
      .finally(() => setIsSending(false));
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!db || !user) return;
    const msgRef = doc(db, "chats", chatId, "messages", msgId);
    await updateDoc(msgRef, {
      [`reactions.${emoji}`]: arrayUnion(user.uid)
    });
  };

  const handleDeleteChat = async () => {
    if (!db || !chatRef) return;
    if (chatId === 'global') return;
    try {
      await deleteDoc(chatRef);
      onBack?.();
      toast({ title: t.success });
    } catch (e) { toast({ variant: "destructive", title: t.error }); }
  };

  const handleBlockUser = async () => {
    if (!db || !user || chatData?.type !== 'individual') return;
    const otherId = chatData.participants.find((p: string) => p !== user.uid);
    if (!otherId) return;
    
    try {
      await updateDoc(doc(db, "users", user.uid), {
        blockedUsers: arrayUnion(otherId)
      });
      toast({ title: t.success });
    } catch (e) { toast({ variant: "destructive", title: t.error }); }
  };

  const handleLeave = async () => {
    if (!db || !user || !chatRef || chatId === 'global') return;
    try {
      await updateDoc(chatRef, {
        participants: arrayRemove(user.uid)
      });
      onBack?.();
    } catch (e) { toast({ variant: "destructive", title: t.error }); }
  };

  let chatName = chatData?.name || "Chat";
  let avatarTargetId = chatId; 
  let otherId = "";

  if (chatData?.type === 'individual' && user) {
    otherId = chatData.participants?.find((p: string) => p !== user.uid) || "";
    if (otherId && chatData.metadata?.[otherId]) {
      chatName = chatData.metadata[otherId].displayName;
      avatarTargetId = otherId;
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={onBack}><X className="w-5 h-5" /></Button>}
          <div className="flex items-center gap-3">
            <UserAvatar userId={avatarTargetId} fallback={chatName} className="w-10 h-10 border-2 border-primary/20" />
            <div className="min-w-0">
              <h2 className="font-semibold text-sm leading-tight truncate">{chatName}</h2>
              <p className="text-[10px] text-primary font-bold uppercase opacity-80">{chatData?.type === 'individual' ? t.personal : t.group}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="w-5 h-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl" align="end">
              {chatData?.type === 'individual' && (
                <>
                  <DropdownMenuItem onClick={handleBlockUser} className="text-destructive"><ShieldBan className="w-4 h-4 mr-2" />{t.block}</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteChat} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />{t.deleteChat}</DropdownMenuItem>
                </>
              )}
              {chatData?.type !== 'individual' && chatId !== 'global' && (
                <DropdownMenuItem onClick={handleLeave} className="text-destructive"><LogOut className="w-4 h-4 mr-2" />{t.leave}</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-sidebar/5">
        <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          {messages?.map((msg, idx) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={cn("flex flex-col group/msg max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                <div className="flex items-start gap-2 w-full">
                  {isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-full"><MoreVertical className="w-3 h-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl">
                        {msg.text && <DropdownMenuItem onClick={() => navigator.clipboard.writeText(msg.text)}><Copy className="w-4 h-4 mr-2" />{t.copy}</DropdownMenuItem>}
                        {msg.imageUrl && <DropdownMenuItem onClick={() => window.open(msg.imageUrl, '_blank')}><Smile className="w-4 h-4 mr-2" />{t.save}</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => deleteDoc(doc(db!, "chats", chatId, "messages", msg.id))} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />{t.delete}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <div className={cn("p-2 px-3 rounded-2xl text-sm shadow-sm relative", isMe ? "cove-gradient text-white rounded-tr-none" : "bg-white dark:bg-zinc-800 text-foreground rounded-tl-none border")}>
                    {msg.replyTo && (
                      <div className="mb-2 p-2 rounded-lg bg-black/10 border-l-2 border-primary text-[10px] opacity-80">
                        <p className="font-bold">{msg.replyTo.senderName}</p>
                        <p className="truncate">{msg.replyTo.text}</p>
                      </div>
                    )}
                    {msg.imageUrl && <img src={msg.imageUrl} className="w-full max-h-[300px] object-cover rounded-xl mb-1" />}
                    {msg.text && <p>{msg.text}</p>}
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions && Object.entries(msg.reactions).map(([emoji, uids]: any) => (
                        <div key={emoji} className="px-1.5 py-0.5 bg-black/10 rounded-full text-[10px] flex items-center gap-1">
                          {emoji} {uids.length}
                        </div>
                      ))}
                    </div>
                  </div>
                  {!isMe && (
                    <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover/msg:opacity-100 transition-opacity rounded-full" onClick={() => setReplyTo(msg)}><Reply className="w-3 h-3" /></Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[9px] text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {!isMe && (
                    <div className="flex gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      {['❤️', '👍', '😂', '🔥'].map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 transition-transform">{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      {replyTo && (
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-primary" />
            <div className="text-[10px] truncate">
              <p className="font-bold">{replyTo.senderName}</p>
              <p className="text-muted-foreground truncate">{replyTo.text || "Фото"}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <div className="p-4 bg-white/80 dark:bg-black/40 backdrop-blur-md border-t shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => handleSend({ imageUrl: ev.target?.result as string });
              reader.readAsDataURL(file);
            }
          }} />
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></Button>
          <Input 
            placeholder={t.message} 
            className="rounded-full bg-background border-none" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend({})} 
          />
          <Button className="rounded-full cove-gradient text-white h-10 w-10 p-0" onClick={() => handleSend({})} disabled={isSending}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
