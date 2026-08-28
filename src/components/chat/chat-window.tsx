"use client";

import * as React from "react";
import { 
  Info, Send, Paperclip, Smile, Megaphone, X, Loader2, 
  Image as ImageIcon, MoreVertical, Trash2, Copy, 
  Calendar, Users, Mic, Square, Play, Pause, Volume2,
  BarChart2, CheckCircle2, PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { translations, Language } from "@/lib/i18n";

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😍", "😎", "🤔", "😊", "👍", "🔥", "❤️", "✨", "🎉", "🙌", "😭", "😮", "🙏", "🚀", "🍕", "☀️", "🌚"];

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
}

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [isPollDialogOpen, setIsPollDialogOpen] = React.useState(false);
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

  const handleSend = (options: { imageUrl?: string; audioUrl?: string; duration?: number; poll?: any }) => {
    const { imageUrl, audioUrl, duration, poll } = options;
    if ((!message.trim() && !imageUrl && !audioUrl && !poll) || !db || !user) return;

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "User",
      text: message.trim() || null,
      timestamp: Date.now()
    };
    if (imageUrl) msgData.imageUrl = imageUrl;
    if (audioUrl) {
      msgData.audioUrl = audioUrl;
      msgData.duration = duration;
    }
    if (poll) msgData.poll = poll;

    const currentMessage = message;
    if (!imageUrl && !audioUrl && !poll) setMessage("");

    addDoc(collection(db, "chats", chatId, "messages"), msgData)
      .then(() => {
        if (chatRef) {
          let lastMsg = currentMessage;
          if (imageUrl) lastMsg = `📷 ${t.photo}`;
          if (audioUrl) lastMsg = `🎤 ${t.voice}`;
          if (poll) lastMsg = `📊 ${t.poll}`;
          
          updateDoc(chatRef, {
            lastMessage: lastMsg,
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
        if (!imageUrl && !audioUrl && !poll) setMessage(currentMessage);
      })
      .finally(() => setIsSending(false));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSend({ audioUrl: base64Audio, duration: recordingTime });
          setRecordingTime(0);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({ variant: "destructive", title: t.error, description: "Microphone error." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: t.error, description: "Select an image." });
      return;
    }
    try {
      const base64 = await compressImage(file);
      handleSend({ imageUrl: base64 });
    } catch (err) {
      toast({ variant: "destructive", title: t.error, description: "Upload failed." });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
    } catch (e: any) {
      toast({ variant: "destructive", title: t.error, description: "Insufficient permissions." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t.success, description: "Copied" });
  };

  const handleVote = async (messageId: string, optionId: string) => {
    if (!db || !user) return;
    const msgRef = doc(db, "chats", chatId, "messages", messageId);
    
    const msg = messages?.find(m => m.id === messageId);
    if (!msg?.poll) return;

    const updatedOptions = msg.poll.options.map((opt: any) => {
      if (opt.id === optionId) {
        const hasVoted = opt.voters?.includes(user.uid);
        return {
          ...opt,
          voters: hasVoted 
            ? opt.voters.filter((v: string) => v !== user.uid)
            : [...(opt.voters || []), user.uid]
        };
      }
      if (!msg.poll.multipleChoice) {
        return {
          ...opt,
          voters: (opt.voters || []).filter((v: string) => v !== user.uid)
        };
      }
      return opt;
    });

    updateDoc(msgRef, {
      "poll.options": updatedOptions
    }).catch(e => {
      toast({ variant: "destructive", title: t.error, description: "Voting failed." });
    });
  };

  let chatName = chatData?.name || "Chat";
  let avatarTargetId = chatId; 
  let subText = t.online;

  if (chatData?.type === 'individual' && user) {
    const otherId = chatData.participants?.find((p: string) => p !== user.uid);
    if (otherId && chatData.metadata?.[otherId]) {
      chatName = chatData.metadata[otherId].displayName;
      avatarTargetId = otherId;
    }
  } else if (chatData?.type === 'group') {
    const count = chatData.participants?.length || 0;
    subText = `${count} ${t.members}`;
  } else if (chatData?.type === 'channel') {
    subText = t.channel;
  }

  const canWrite = chatData?.type !== 'channel' || chatData?.ownerId === user?.uid;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors shrink-0" onClick={onBack}>
              <X className="w-5 h-5" />
            </Button>
          )}
          <UserAvatar userId={avatarTargetId} fallback={chatName} className="w-10 h-10 border-2 border-primary/20 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate max-w-[150px] sm:max-w-none flex items-center gap-1 text-foreground">
              {chatName}
              {chatData?.type === 'channel' && <Megaphone className="w-3 h-3 text-primary" />}
            </h2>
            <p className="text-[10px] text-primary font-bold tracking-wider uppercase opacity-80">{subText}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary">
                <Info className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
              <DialogHeader><DialogTitle>{t.details}</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-6 py-4">
                <UserAvatar userId={avatarTargetId} fallback={chatName} className="w-24 h-24 border-4 border-primary/20" />
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold">{chatName}</h3>
                  <p className="text-sm text-muted-foreground">{chatData?.type}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 bg-sidebar/5">
        <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          {messages?.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            const alignLeft = chatData?.type === 'channel' || !isMe;
            
            return (
              <div key={msg.id} className={cn("flex flex-col group/msg max-w-[85%] sm:max-w-[75%]", alignLeft ? "mr-auto items-start" : "ml-auto items-end")}>
                <div className="flex items-start gap-1 w-full">
                  <div className={cn("p-1 rounded-2xl text-sm shadow-sm transition-all overflow-hidden flex-1", !alignLeft ? "cove-gradient text-white rounded-tr-none" : "bg-white dark:bg-zinc-800 text-foreground rounded-tl-none border border-primary/10")}>
                    {chatData?.type === 'group' && !isMe && (
                      <div className="flex items-center gap-2 mb-1 px-3 pt-2">
                        <UserAvatar userId={msg.senderId} fallback={msg.senderName} className="w-4 h-4 shrink-0" />
                        <p className="text-[9px] font-bold opacity-70">{msg.senderName}</p>
                      </div>
                    )}
                    {msg.imageUrl && <img src={msg.imageUrl} alt="Shared" className="w-full max-h-[300px] object-cover rounded-xl" />}
                    {msg.audioUrl && <AudioBubble audioUrl={msg.audioUrl} duration={msg.duration} isMe={!alignLeft} />}
                    {msg.poll && <PollBubble poll={msg.poll} messageId={msg.id} onVote={handleVote} isMe={!alignLeft} currentUserId={user?.uid} lang={lang} />}
                    {msg.text && <div className={cn("px-3 py-2", (msg.imageUrl || msg.audioUrl || msg.poll) && "pt-1")}>{msg.text}</div>}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity">
                        <MoreVertical className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={alignLeft ? "start" : "end"} className="rounded-xl">
                      {msg.text && <DropdownMenuItem onClick={() => copyToClipboard(msg.text!)} className="gap-2 cursor-pointer"><Copy className="w-4 h-4" /> <span>{t.copy}</span></DropdownMenuItem>}
                      {(isMe || chatData?.ownerId === user?.uid) && <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive"><Trash2 className="w-4 h-4" /> <span>{t.delete}</span></DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            );
          })}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>

      {canWrite ? (
        <div className="p-4 bg-white/80 dark:bg-black/40 backdrop-blur-md border-t shrink-0">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 bg-red-500/10 p-2 px-4 rounded-full animate-pulse border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-500 font-mono">{formatTime(recordingTime)}</span>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="rounded-full text-red-500 hover:bg-red-500/20" onClick={stopRecording}><Square className="w-5 h-5 fill-current" /></Button>
              </div>
            ) : (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary shrink-0"><Paperclip className="w-5 h-5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2 rounded-2xl shadow-xl flex flex-col gap-1" align="start" side="top">
                    <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-10" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="w-4 h-4 text-primary" /> <span className="text-xs font-medium">{t.photo}</span>
                    </Button>
                    <CreatePollDialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen} onPollCreate={(poll) => handleSend({ poll })} lang={lang}>
                      <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl h-10" onClick={() => setIsPollDialogOpen(true)}>
                        <BarChart2 className="w-4 h-4 text-accent" /> <span className="text-xs font-medium">{t.poll}</span>
                      </Button>
                    </CreatePollDialog>
                  </PopoverContent>
                </Popover>

                <div className="flex-1 relative min-w-0">
                  <Input placeholder={t.message} className="pr-10 bg-background border-none rounded-full focus-visible:ring-primary shadow-inner h-11" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSend({}); }} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:text-primary"><Smile className="w-5 h-5" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 rounded-2xl grid grid-cols-5 gap-1 shadow-xl" align="end" side="top">
                      {COMMON_EMOJIS.map(emoji => <button key={emoji} onClick={() => setMessage(prev => prev + emoji)} className="text-xl hover:bg-sidebar/50 p-1 rounded-lg transition-colors">{emoji}</button>)}
                    </PopoverContent>
                  </Popover>
                </div>
                {message.trim() ? (
                  <Button className="rounded-full cove-gradient hover:opacity-90 shadow-md text-white px-4 h-11 shrink-0" onClick={() => handleSend({})} disabled={isSending}>
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary shrink-0" onClick={startRecording}><Mic className="w-5 h-5" /></Button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-sidebar/20 text-center border-t shrink-0">
          <p className="text-xs text-muted-foreground">{t.adminsOnly}</p>
        </div>
      )}
    </div>
  );
}

function CreatePollDialog({ open, onOpenChange, onPollCreate, lang, children }: { 
  open: boolean; 
  onOpenChange: (val: boolean) => void;
  onPollCreate: (poll: any) => void;
  lang: Language;
  children: React.ReactNode;
}) {
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);
  const [multipleChoice, setMultipleChoice] = React.useState(false);
  const t = translations[lang];

  const handleCreate = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
    onPollCreate({
      question: question.trim(),
      options: options.filter(o => o.trim()).map(o => ({ id: Math.random().toString(36).substring(7), text: o.trim(), voters: [] })),
      multipleChoice
    });
    onOpenChange(false);
    setQuestion("");
    setOptions(["", ""]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
        <DialogHeader><DialogTitle>{t.newPoll}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t.question}</span>
            <Input placeholder={t.question} value={question} onChange={e => setQuestion(e.target.value)} className="rounded-xl h-11" />
          </div>
          <div className="space-y-3"><span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">{t.options}</span>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2">
                <Input placeholder={`${t.poll} ${idx + 1}`} value={opt} onChange={e => { const n = [...options]; n[idx] = e.target.value; setOptions(n); }} className="rounded-xl h-10" />
                {options.length > 2 && <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="rounded-full shrink-0"><X className="w-4 h-4 text-destructive" /></Button>}
              </div>
            ))}
            {options.length < 10 && <Button variant="ghost" className="w-full rounded-xl text-primary border border-dashed border-primary/20 h-10" onClick={() => setOptions([...options, ""])}><PlusCircle className="w-4 h-4 mr-2" /> {t.addOption}</Button>}
          </div>
          <div className="flex items-center justify-between p-3 bg-sidebar/10 rounded-2xl">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-accent" /><span className="text-xs font-semibold">{t.multipleAnswers}</span></div>
            <Checkbox checked={multipleChoice} onCheckedChange={(val) => setMultipleChoice(!!val)} />
          </div>
          <Button className="w-full rounded-xl cove-gradient h-12 text-white font-bold" onClick={handleCreate} disabled={!question.trim() || options.filter(o => o.trim()).length < 2}>{t.create}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PollBubble({ poll, messageId, onVote, isMe, currentUserId, lang }: { 
  poll: any; 
  messageId: string; 
  onVote: (mid: string, oid: string) => void;
  isMe: boolean;
  currentUserId?: string;
  lang: Language;
}) {
  const t = translations[lang];
  const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + (opt.voters?.length || 0), 0);
  const userHasVoted = poll.options.some((opt: any) => opt.voters?.includes(currentUserId));

  return (
    <div className="p-4 space-y-3 min-w-[240px] max-w-full">
      <div className="space-y-1">
        <h4 className={cn("font-bold text-sm leading-tight", isMe ? "text-white" : "text-foreground")}>{poll.question}</h4>
        <p className={cn("text-[9px] font-bold opacity-60 uppercase tracking-wider", isMe ? "text-white" : "text-muted-foreground")}>{userHasVoted ? t.results : t.choose}</p>
      </div>
      <div className="space-y-2">
        {poll.options.map((opt: any) => {
          const votes = opt.voters?.length || 0;
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isVoted = opt.voters?.includes(currentUserId);
          return (
            <div key={opt.id} className="relative cursor-pointer group/opt" onClick={() => onVote(messageId, opt.id)}>
              <div className={cn("relative z-10 flex items-center justify-between p-2 px-3 rounded-xl border transition-all", isVoted ? (isMe ? "bg-white/20 border-white/40" : "bg-primary/10 border-primary/30") : (isMe ? "bg-black/10 border-white/10 hover:bg-black/20" : "bg-sidebar/30 border-primary/5 hover:bg-sidebar/50"))}>
                <span className={cn("text-xs font-medium truncate pr-4", isMe ? "text-white" : "text-foreground")}>{opt.text}</span>
                {userHasVoted && <span className={cn("text-[10px] font-bold shrink-0", isMe ? "text-white/80" : "text-muted-foreground")}>{percent}%</span>}
                {isVoted && <CheckCircle2 className={cn("absolute -top-1 -right-1 w-3 h-3 fill-current", isMe ? "text-white" : "text-accent")} />}
              </div>
              {userHasVoted && <div className={cn("absolute inset-0 rounded-xl transition-all duration-500", isMe ? "bg-white/10" : "bg-primary/10")} style={{ width: `${percent}%` }} />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className={cn("text-[9px] font-bold opacity-60", isMe ? "text-white" : "text-muted-foreground")}>{totalVotes} {totalVotes === 1 ? t.vote : t.votes}</span>
        {poll.multipleChoice && <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full", isMe ? "bg-white/20 text-white" : "bg-accent/10 text-accent")}>MULTI</span>}
      </div>
    </div>
  );
}

function AudioBubble({ audioUrl, duration, isMe }: { audioUrl: string; duration?: number; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const togglePlay = () => { if (audioRef.current) { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); } };
  const onTimeUpdate = () => { if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0); };
  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs.toString().padStart(2, '0')}`; };

  return (
    <div className="flex items-center gap-3 p-3 py-2 min-w-[200px]">
      <audio ref={audioRef} src={audioUrl} onTimeUpdate={onTimeUpdate} onEnded={() => { setIsPlaying(false); setProgress(0); }} className="hidden" />
      <Button variant="ghost" size="icon" className={cn("w-8 h-8 rounded-full shrink-0", isMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-primary/10 text-primary hover:bg-primary/20")} onClick={togglePlay}>
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
      </Button>
      <div className="flex-1 flex flex-col gap-1">
        <div className={cn("w-full h-1 rounded-full relative", isMe ? "bg-white/20" : "bg-primary/10")}>
          <div className={cn("h-full rounded-full transition-all duration-100", isMe ? "bg-white" : "bg-primary")} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className={cn("text-[9px] font-bold opacity-70", isMe ? "text-white" : "text-muted-foreground")}>{isPlaying && audioRef.current ? formatTime(audioRef.current.currentTime) : formatTime(duration || 0)}</span>
          <Volume2 className={cn("w-3 h-3 opacity-40", isMe ? "text-white" : "text-muted-foreground")} />
        </div>
      </div>
    </div>
  );
}