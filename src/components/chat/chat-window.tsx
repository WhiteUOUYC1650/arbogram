
"use client";

import * as React from "react";
import { 
  Info, Send, Paperclip, Smile, Megaphone, X, Loader2, 
  ImageIcon, MoreVertical, Trash2, Copy, Phone,
  Mic, Square, Play, Pause, Volume2, Globe, Calendar, User as UserIcon,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
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
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [lang, setLang] = React.useState<Language>('ru');
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  React.useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Очистка статуса печатает при размонтировании
  React.useEffect(() => {
    return () => {
      if (db && user && chatRef) {
        updateDoc(chatRef, { [`typing.${user.uid}`]: deleteField() }).catch(() => {});
      }
    };
  }, [db, user, chatRef]);

  const handleTyping = () => {
    if (!db || !user || !chatRef) return;
    updateDoc(chatRef, { [`typing.${user.uid}`]: Date.now() }).catch(() => {});
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (chatRef) updateDoc(chatRef, { [`typing.${user.uid}`]: deleteField() }).catch(() => {});
    }, 3000);
  };

  const handleSend = (options: { imageUrl?: string; audioUrl?: string; duration?: number }) => {
    const { imageUrl, audioUrl, duration } = options;
    if ((!message.trim() && !imageUrl && !audioUrl) || !db || !user) return;

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "User",
      timestamp: Date.now(),
      type: "text",
    };

    if (imageUrl) {
      msgData.type = "image";
      msgData.imageUrl = imageUrl;
      msgData.text = message.trim() || null;
    } else if (audioUrl) {
      msgData.type = "audio";
      msgData.audioUrl = audioUrl;
      msgData.duration = duration;
    } else {
      msgData.text = message.trim();
    }

    addDoc(collection(db, "chats", chatId, "messages"), msgData)
      .then(() => {
        if (chatRef) {
          let lastMsg = msgData.text || "";
          if (imageUrl) lastMsg = `📷 ${t.photo}`;
          if (audioUrl) lastMsg = `🎤 ${t.voice}`;
          updateDoc(chatRef, { 
            lastMessage: lastMsg, 
            lastMessageTime: Date.now(), 
            [`typing.${user.uid}`]: deleteField() 
          }).catch(() => {});
        }
        if (!imageUrl && !audioUrl) setMessage("");
      })
      .catch(async (e) => {
        const error = new FirestorePermissionError({ path: `chats/${chatId}/messages`, operation: "create", requestResourceData: msgData });
        (error as any).originalError = e;
        errorEmitter.emit("permission-error", error);
      })
      .finally(() => setIsSending(false));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => { handleSend({ audioUrl: reader.result as string, duration: recordingTime }); setRecordingTime(0); };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) { toast({ variant: "destructive", title: t.error, description: t.micRequired }); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleCall = () => {
    if (chatData?.type === 'individual' && user) {
      const otherId = chatData.participants?.find((p: string) => p !== user.uid);
      if (otherId && (window as any).__startCall) (window as any).__startCall(otherId);
    } else { 
      toast({ title: "Групповые звонки", description: "Функция будет доступна в v1.3" }); 
    }
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

  const targetUserRef = useMemoFirebase(() => (db && otherId ? doc(db, "users", otherId) : null), [db, otherId]);
  const { data: targetUserData } = useDoc(targetUserRef);

  // Исправленная логика заголовка
  let subStatusText = t.offline;
  if (chatData?.type === 'individual') {
    if (targetUserData?.status === 'online') {
      subStatusText = t.online;
    } else if (targetUserData?.lastSeen) {
      const timeStr = new Date(targetUserData.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      subStatusText = `${t.offline} (${timeStr})`;
    }
  } else if (chatData?.type === 'group') {
    subStatusText = `${chatData.participants?.length || 0} ${t.members}`;
  } else if (chatData?.type === 'channel') {
    subStatusText = t.channel;
  }

  const typingUsers = React.useMemo(() => {
    if (!chatData?.typing || !user) return [];
    const now = Date.now();
    return Object.entries(chatData.typing)
      .filter(([uid, timestamp]) => uid !== user.uid && now - (timestamp as number) < 5000)
      .map(([uid]) => chatData.metadata?.[uid]?.displayName || "Кто-то");
  }, [chatData?.typing, user]);

  const canWrite = chatData?.type !== 'channel' || chatData?.ownerId === user?.uid;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground shrink-0" onClick={onBack}>
              <X className="w-5 h-5" />
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <div className="cursor-pointer flex items-center gap-3">
                <div className="relative shrink-0">
                  <UserAvatar userId={avatarTargetId} fallback={chatName} className="w-10 h-10 border-2 border-primary/20" />
                  {targetUserData?.status === 'online' && chatData?.type === 'individual' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm leading-tight truncate max-w-[150px] sm:max-w-none flex items-center gap-1 text-foreground">
                    {chatName}
                    {chatData?.type === 'channel' && <Megaphone className="w-3 h-3 text-primary" />}
                  </h2>
                  <p className="text-[10px] text-primary font-bold tracking-wider uppercase opacity-80">
                    {typingUsers.length > 0 ? `${typingUsers.join(', ')} ${t.typing}` : subStatusText}
                  </p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-3xl p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-0"><DialogTitle>{t.profile}</DialogTitle></DialogHeader>
              <ProfileDetails userId={avatarTargetId} chatData={chatData} t={t} onStartChat={otherId ? () => onStartDirectChat?.(otherId) : undefined} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-1">
          {chatData?.type === 'individual' && (
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary" onClick={handleCall}>
              <Phone className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary"><MoreVertical className="w-5 h-5" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 bg-sidebar/5">
        <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          {messages?.reduce((acc: React.ReactNode[], msg, idx) => {
            const isMe = msg.senderId === user?.uid;
            const alignLeft = chatData?.type === 'channel' || !isMe;
            const msgDate = new Date(msg.timestamp).toLocaleDateString();
            const prevMsgDate = idx > 0 ? new Date(messages[idx - 1].timestamp).toLocaleDateString() : null;

            if (msgDate !== prevMsgDate) {
              acc.push(
                <div key={`date-${msg.timestamp}`} className="flex justify-center my-6">
                  <div className="px-4 py-1.5 bg-sidebar/50 backdrop-blur-md rounded-2xl border border-primary/10 shadow-sm">
                     <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{msgDate}</span>
                  </div>
                </div>
              );
            }

            acc.push(
              <div key={msg.id} className={cn("flex flex-col group/msg max-w-[85%] sm:max-w-[75%]", alignLeft ? "mr-auto items-start" : "ml-auto items-end")}>
                <div className="flex items-start gap-1 w-full">
                  <div className={cn("p-1 rounded-2xl text-sm shadow-sm transition-all overflow-hidden flex-1", !alignLeft ? "cove-gradient text-white rounded-tr-none" : "bg-white dark:bg-zinc-800 text-foreground rounded-tl-none border border-primary/10")}>
                    {chatData?.type === 'group' && !isMe && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="flex items-center gap-2 mb-1 px-3 pt-2 cursor-pointer hover:opacity-80 transition-opacity">
                            <UserAvatar userId={msg.senderId} fallback={msg.senderName} className="w-4 h-4 shrink-0" />
                            <p className="text-[9px] font-bold opacity-70">{msg.senderName}</p>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl p-0 overflow-hidden">
                          <DialogHeader className="p-6 pb-0"><DialogTitle>{t.profile}</DialogTitle></DialogHeader>
                          <ProfileDetails userId={msg.senderId} t={t} onStartChat={() => onStartDirectChat?.(msg.senderId)} />
                        </DialogContent>
                      </Dialog>
                    )}
                    {msg.type === "image" && msg.imageUrl && <img src={msg.imageUrl} alt="Shared" className="w-full max-h-[300px] object-cover rounded-xl" />}
                    {msg.type === "audio" && msg.audioUrl && <AudioBubble audioUrl={msg.audioUrl} duration={msg.duration} isMe={!alignLeft} />}
                    {msg.text && <div className={cn("px-3 py-2", (msg.imageUrl || msg.audioUrl) && "pt-1")}>{msg.text}</div>}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            );
            return acc;
          }, [])}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>

      {canWrite ? (
        <div className="p-4 bg-white/80 dark:bg-black/40 backdrop-blur-md border-t shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 bg-red-500/10 p-2 px-4 rounded-full animate-pulse border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-500 font-mono">{Math.floor(recordingTime/60)}:{String(recordingTime%60).padStart(2,'0')}</span>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="rounded-full text-red-500" onClick={stopRecording}><Square className="w-5 h-5 fill-current" /></Button>
              </div>
            ) : (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => handleSend({ imageUrl: ev.target?.result as string });
                    reader.readAsDataURL(file);
                  }
                }} />
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground shrink-0" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-5 h-5" /></Button>
                <div className="flex-1 relative min-w-0">
                  <Input 
                    placeholder={t.message} 
                    className="pr-10 bg-background border-none rounded-full h-11" 
                    value={message} 
                    onChange={(e) => { setMessage(e.target.value); handleTyping(); }} 
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend({}); }} 
                  />
                </div>
                {message.trim() ? (
                  <Button className="rounded-full cove-gradient text-white px-4 h-11 shrink-0" onClick={() => handleSend({})} disabled={isSending}>
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground shrink-0" onClick={startRecording}><Mic className="w-5 h-5" /></Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-sidebar/20 text-center border-t shrink-0"><p className="text-xs text-muted-foreground">{t.adminsOnly}</p></div>
      )}
    </div>
  );
}

function ProfileDetails({ userId, chatData, t, onStartChat }: { userId: string, chatData?: any, t: any, onStartChat?: () => void }) {
  const db = useFirestore();
  const userRef = useMemoFirebase(() => db ? doc(db, "users", userId) : null, [db, userId]);
  const { data: userData } = useDoc(userRef);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col items-center gap-4">
        <UserAvatar userId={userId} fallback={userData?.displayName || chatData?.name} className="w-24 h-24 border-4 border-primary/20" />
        <div className="text-center space-y-1">
          <h3 className="text-xl font-bold">{userData?.displayName || chatData?.name}</h3>
          <div className="flex items-center justify-center gap-2">
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80">{userData?.username || "@user"}</p>
            {userData?.status === 'online' ? (
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
            ) : (
              <span className="text-[9px] text-muted-foreground">({t.offline} {userData?.lastSeen ? new Date(userData.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})</span>
            )}
          </div>
        </div>
      </div>
      {onStartChat && <Button className="rounded-2xl cove-gradient w-full h-12 gap-2" onClick={onStartChat}><MessageCircle className="w-5 h-5" />{t.sendMessage}</Button>}
    </div>
  );
}

function AudioBubble({ audioUrl, duration, isMe }: { audioUrl: string; duration?: number; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const togglePlay = () => { if (audioRef.current) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); } };
  return (
    <div className="flex items-center gap-3 p-3 py-2 min-w-[200px]">
      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
      <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-full", isMe ? "bg-white/20 text-white" : "bg-primary/10 text-primary")} onClick={togglePlay}>
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
      </Button>
      <div className="flex-1">
        <div className={cn("w-full h-1 rounded-full", isMe ? "bg-white/20" : "bg-primary/10")} />
        <span className={cn("text-[9px] font-bold opacity-70", isMe ? "text-white" : "text-muted-foreground")}>{Math.floor((duration||0)/60)}:{String((duration||0)%60).padStart(2,'0')}</span>
      </div>
    </div>
  );
}
