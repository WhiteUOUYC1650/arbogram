
"use client";

import * as React from "react";
import { 
  Send, Paperclip, X, Loader2, 
  MoreVertical, Trash2, Copy, 
  Reply, Smile, ShieldBan, LogOut, CheckCheck, Download, Globe, Image as ImageIcon, Mic, StopCircle, BarChart2, StickyNote, Plus
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
import { UserProfileDialog } from "./user-profile-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";

const GLOBAL_CHAT_ID = "p7gSC3o9OxVezsjDbrFq";

export function ChatWindow({ chatId, onBack, onStartDirectChat }: ChatWindowProps) {
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const [replyTo, setReplyTo] = React.useState<any>(null);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = React.useState(false);
  const [pollDialogOpen, setPollDialogOpen] = React.useState(false);
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];
  const chatRef = useMemoFirebase(() => db ? doc(db, "chats", chatId) : null, [db, chatId]);
  const { data: chatData } = useDoc(chatRef);
  
  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  }, [db, chatId]);
  const { data: rawMessages } = useCollection(messagesQuery);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawMessages]);

  const handleSend = async (options: { audioUrl?: string; duration?: number; poll?: any; sticker?: { id: string; packId: string } } = {}) => {
    const { audioUrl, duration, poll, sticker } = options;
    if (!message.trim() && selectedImages.length === 0 && !audioUrl && !poll && !sticker) return;
    if (!db || !user) return;

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "User",
      timestamp: Date.now(),
      type: sticker ? "sticker" : (poll ? "poll" : (audioUrl ? "audio" : (selectedImages.length > 0 ? "image" : "text"))),
      text: message.trim() || null,
      imageUrls: selectedImages.length > 0 ? selectedImages : null,
      audioUrl: audioUrl || null,
      poll: poll || null,
      stickerId: sticker?.id || null,
      packId: sticker?.packId || null,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || 'Вложение', senderName: replyTo.senderName } : null
    };

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), msgData);
      let last = msgData.text || "Вложение";
      if (sticker) last = "🎨 Стикер";
      if (poll) last = "📊 Опрос";
      await updateDoc(chatRef!, { lastMessage: last, lastMessageTime: Date.now() });
      setMessage(""); setSelectedImages([]); setReplyTo(null); setStickerPickerOpen(false);
    } catch (e) { toast({ title: "Ошибка отправки" }); } finally { setIsSending(false); }
  };

  const handleVote = async (msgId: string, optionIndex: number) => {
    if (!db || !user) return;
    const msgRef = doc(db, "chats", chatId, "messages", msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    
    const poll = snap.data().poll;
    const votes = poll.votes || {};
    votes[user.uid] = optionIndex;
    
    await updateDoc(msgRef, { "poll.votes": votes });
  };

  const renderDateSeparator = (timestamp: number, prevTimestamp?: number) => {
    const date = new Date(timestamp);
    const prevDate = prevTimestamp ? new Date(prevTimestamp) : null;
    
    if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
      let label = format(date, "d MMMM yyyy", { locale: lang === 'ru' ? ru : enUS });
      const now = new Date();
      if (date.toDateString() === now.toDateString()) label = t.today;
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) label = t.yesterday;

      return (
        <div className="flex justify-center my-4">
          <span className="px-3 py-1 bg-muted/50 rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {label}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full md:hidden"><X className="w-5 h-5" /></Button>}
          <UserProfileDialog userId={chatId === GLOBAL_CHAT_ID ? "" : chatId} onStartChat={() => {}}>
            <div className="flex items-center gap-3 cursor-pointer">
              {chatId === GLOBAL_CHAT_ID ? (
                <div className="w-10 h-10 rounded-full cove-gradient flex items-center justify-center text-white"><Globe className="w-5 h-5" /></div>
              ) : (
                <UserAvatar userId={chatId} className="w-10 h-10 border-2 border-primary/20" />
              )}
              <div className="flex flex-col">
                <h2 className="font-bold text-sm leading-none">{chatId === GLOBAL_CHAT_ID ? "Общий чат" : chatData?.name || "Чат"}</h2>
                <span className="text-[10px] text-muted-foreground font-medium">{chatId === GLOBAL_CHAT_ID ? "Redirection Public" : (chatData?.type === 'individual' ? "Личная переписка" : "Группа")}</span>
              </div>
            </div>
          </UserProfileDialog>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {rawMessages?.map((msg: any, i) => (
            <React.Fragment key={msg.id}>
              {renderDateSeparator(msg.timestamp, rawMessages[i-1]?.timestamp)}
              <div className={cn("flex gap-2 max-w-[85%]", msg.senderId === user?.uid ? "ml-auto flex-row-reverse" : "mr-auto")}>
                {msg.senderId !== user?.uid && (
                  <UserProfileDialog userId={msg.senderId} onStartChat={onStartDirectChat}>
                    <UserAvatar userId={msg.senderId} fallback={msg.senderName} className="w-8 h-8 shrink-0 mt-1 cursor-pointer border shadow-sm" />
                  </UserProfileDialog>
                )}
                <div className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                  {msg.senderId !== user?.uid && (chatData?.type !== 'individual' || chatId === GLOBAL_CHAT_ID) && (
                    <span className="text-[10px] font-bold text-primary ml-1">{msg.senderName}</span>
                  )}
                  <div className={cn(
                    "relative p-3 rounded-2xl text-sm shadow-sm",
                    msg.senderId === user?.uid ? "cove-gradient text-white rounded-tr-none" : "bg-white dark:bg-zinc-800 border rounded-tl-none"
                  )}>
                    {msg.replyTo && (
                      <div className="mb-2 p-2 rounded-lg bg-black/10 text-[10px] border-l-4 border-primary">
                        <p className="font-bold opacity-70">{msg.replyTo.senderName}</p>
                        <p className="truncate opacity-90">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {msg.type === 'sticker' && <StickerRenderer packId={msg.packId} stickerId={msg.stickerId} />}
                    
                    {msg.type === 'poll' && (
                      <div className="space-y-3 min-w-[200px]">
                        <p className="font-bold flex items-center gap-2"><BarChart2 className="w-4 h-4" /> {msg.poll.question}</p>
                        <div className="space-y-2">
                          {msg.poll.options.map((opt: string, idx: number) => {
                            const votes = Object.values(msg.poll.votes || {});
                            const count = votes.filter(v => v === idx).length;
                            const percent = votes.length > 0 ? (count / votes.length) * 100 : 0;
                            const isVoted = msg.poll.votes?.[user?.uid!] === idx;

                            return (
                              <button 
                                key={idx} 
                                onClick={() => handleVote(msg.id, idx)}
                                className={cn(
                                  "w-full text-left p-2 rounded-xl relative overflow-hidden border transition-all",
                                  isVoted ? "border-primary bg-primary/10" : "bg-muted/30"
                                )}
                              >
                                <div className="absolute inset-0 bg-primary/20 transition-all" style={{ width: `${percent}%` }} />
                                <div className="relative flex justify-between text-xs font-medium">
                                  <span>{opt}</span>
                                  <span>{Math.round(percent)}%</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] opacity-60 text-center">{Object.keys(msg.poll.votes || {}).length} проголосовало</p>
                      </div>
                    )}

                    {msg.type === 'audio' && (
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <audio controls className="h-8 w-40">
                          <source src={msg.audioUrl} type="audio/webm" />
                        </audio>
                      </div>
                    )}

                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    
                    <span className={cn("text-[9px] mt-1 block opacity-60 text-right", msg.senderId === user?.uid ? "text-white/80" : "text-muted-foreground")}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {stickerPickerOpen && <StickerPicker onSelect={(s) => handleSend({ sticker: s })} />}

      <div className="p-4 border-t bg-background flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-xl text-xs animate-in slide-in-from-bottom">
            <div className="flex items-center gap-2">
              <Reply className="w-3 h-3 text-primary" />
              <div className="min-w-0">
                <p className="font-bold truncate">{replyTo.senderName}</p>
                <p className="truncate opacity-70">{replyTo.text || "Вложение"}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted"><Paperclip className="w-5 h-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-2xl w-48 p-2">
              <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer" onClick={() => setPollDialogOpen(true)}>
                <BarChart2 className="w-4 h-4 text-blue-500" /> {t.group} Опрос
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer">
                <ImageIcon className="w-4 h-4 text-green-500" /> {t.photo}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={() => setStickerPickerOpen(!stickerPickerOpen)} className="rounded-full"><Smile className="w-5 h-5" /></Button>
          
          <div className="flex-1 relative">
            <Input 
              placeholder={t.message} 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()} 
              className="h-11 rounded-2xl bg-muted/50 border-none pr-10 focus-visible:ring-primary"
            />
          </div>

          {message.trim() ? (
            <Button className="h-11 w-11 rounded-full cove-gradient text-white shadow-lg p-0" onClick={() => handleSend()} disabled={isSending}>
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <VoiceRecorder onSend={(url) => handleSend({ audioUrl: url })} />
          )}
        </div>
      </div>

      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle>Создать опрос</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input placeholder="Ваш вопрос..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="rounded-xl h-12" />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input 
                    placeholder={`Вариант ${i + 1}`} 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }} 
                    className="rounded-xl h-10"
                  />
                  {pollOptions.length > 2 && <Button variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>}
                </div>
              ))}
              <Button variant="ghost" className="w-full rounded-xl text-primary text-xs" onClick={() => setPollOptions([...pollOptions, ""])}>+ Добавить вариант</Button>
            </div>
            <Button className="w-full h-12 rounded-2xl bg-accent text-white font-bold" onClick={() => { handleSend({ poll: { question: pollQuestion, options: pollOptions.filter(o => o.trim()), votes: {} } }); setPollDialogOpen(false); setPollQuestion(""); setPollOptions(["", ""]); }}>Создать опрос</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VoiceRecorder({ onSend }: { onSend: (url: string) => void }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [timer, setTimer] = React.useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => onSend(e.target?.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    } catch (err) {
      alert("Доступ к микрофону отклонен");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording && <span className="text-[10px] font-mono text-destructive animate-pulse">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</span>}
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn("h-11 w-11 rounded-full transition-all", isRecording ? "bg-destructive text-white scale-110" : "hover:bg-muted text-muted-foreground")}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
        onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
      >
        {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>
    </div>
  );
}

function StickerPicker({ onSelect }: { onSelect: (s: { id: string; packId: string }) => void }) {
  const db = useFirestore();
  const packsQuery = query(collection(db!, "stickerPacks"), orderBy("createdAt", "desc"), limit(20));
  const { data: packs } = useCollection(packsQuery);
  const [activePackId, setActivePackId] = React.useState<string | null>(null);

  return (
    <div className="h-64 border-t bg-muted/20 animate-in slide-in-from-bottom flex flex-col">
      <Tabs defaultValue={packs?.[0]?.id || "none"} className="flex-1 flex flex-col overflow-hidden" onValueChange={setActivePackId}>
        <TabsList className="h-10 bg-transparent px-4 gap-2 overflow-x-auto justify-start">
          {packs?.map(p => (
            <TabsTrigger key={p.id} value={p.id} className="text-xs h-8 px-4 rounded-xl data-[state=active]:bg-white">{p.name}</TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1 overflow-y-auto p-4">
          {packs?.map(p => (
            <TabsContent key={p.id} value={p.id} className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-0">
              <StickerList packId={p.id} onSelect={onSelect} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

function StickerList({ packId, onSelect }: { packId: string, onSelect: any }) {
  const db = useFirestore();
  const stickersQuery = query(collection(db!, "stickerPacks", packId, "stickers"));
  const { data: stickers } = useCollection(stickersQuery);
  return <>{stickers?.map(s => <div key={s.id} onClick={() => onSelect({ id: s.id, packId })} className="cursor-pointer hover:bg-muted p-2 rounded-xl transition-all hover:scale-105 active:scale-95"><StickerRenderer packId={packId} stickerId={s.id} /></div>)}</>;
}

function StickerRenderer({ packId, stickerId }: { packId: string, stickerId: string }) {
  const db = useFirestore();
  const chunksQuery = query(collection(db!, "stickerPacks", packId, "stickers", stickerId, "chunks"), orderBy("index", "asc"));
  const { data: chunks } = useCollection(chunksQuery);
  const fullData = React.useMemo(() => chunks?.map(c => c.data).join("") || null, [chunks]);

  if (!fullData) return <div className="w-16 h-16 bg-muted animate-pulse rounded-lg" />;
  return <img src={fullData} className="w-24 h-24 object-contain" alt="Sticker" />;
}
