"use client";

import * as React from "react";
import { 
  Send, Paperclip, X, Loader2, 
  MoreVertical, Trash2, Copy, 
  Clock, Reply, Smile, ShieldBan, LogOut, CheckCheck, Download, Globe, Image as ImageIcon, Mic, StopCircle, BarChart2
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
  
  // Voice Recording State
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  
  // Poll State
  const [pollDialogOpen, setPollDialogOpen] = React.useState(false);
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState(["", ""]);

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
  const recordingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

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

  const { data: rawMessages } = useCollection(messagesQuery);

  const messagesWithDates = React.useMemo(() => {
    if (!rawMessages) return [];
    const grouped: any[] = [];
    let lastDate = "";

    rawMessages.forEach((msg) => {
      const date = new Date(msg.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateString = "";
      if (date.toDateString() === today.toDateString()) {
        dateString = t.today;
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateString = t.yesterday;
      } else {
        dateString = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' });
      }

      if (dateString !== lastDate) {
        grouped.push({ type: 'date', date: dateString });
        lastDate = dateString;
      }
      grouped.push({ ...msg, type: msg.type || 'text' });
    });

    return grouped;
  }, [rawMessages, lang, t]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [rawMessages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          handleSend({ audioUrl: base64, duration: recordingTime });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast({ variant: "destructive", title: t.error, description: "Доступ к микрофону запрещен." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const renderTextWithMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <MentionTrigger key={i} username={part} onStartChat={onStartDirectChat}>
            <span className="text-white bg-white/20 px-1 rounded-md cursor-pointer hover:bg-white/40 transition-colors font-bold">
              {part}
            </span>
          </MentionTrigger>
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

  const handleSend = async (options: { audioUrl?: string; duration?: number; poll?: any } = {}) => {
    const { audioUrl, duration, poll } = options;
    const hasText = message.trim().length > 0;
    const hasImages = selectedImages.length > 0;
    
    if (!hasText && !hasImages && !audioUrl && !poll) return;
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
      type: poll ? "poll" : (audioUrl ? "audio" : (hasImages ? "image" : "text")),
      text: message.trim() || null,
      imageUrls: hasImages ? selectedImages : null,
      audioUrl: audioUrl || null,
      duration: duration || null,
      poll: poll || null,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || (replyTo.imageUrls ? '📷 Фото' : '🎤 Голос'), senderName: replyTo.senderName } : null,
      reactions: {}
    };

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), msgData);
      if (chatRef) {
        let lastMsg = msgData.text;
        if (poll) lastMsg = `📊 Опрос: ${poll.question}`;
        else if (audioUrl) lastMsg = "🎤 Голосовое";
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

  const handlePollCreate = () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) {
      toast({ variant: "destructive", title: t.error, description: "Заполните вопрос и все варианты." });
      return;
    }
    const poll = {
      question: pollQuestion,
      options: pollOptions.map(text => ({ text, votes: [] }))
    };
    handleSend({ poll });
    setPollDialogOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const handleVote = async (msgId: string, optionIndex: number) => {
    if (!db || !user) return;
    const msgRef = doc(db, "chats", chatId, "messages", msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const newOptions = [...data.poll.options];
    
    newOptions.forEach(opt => {
      opt.votes = opt.votes.filter((uid: string) => uid !== user.uid);
    });

    newOptions[optionIndex].votes.push(user.uid);
    await updateDoc(msgRef, { "poll.options": newOptions });
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
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" onClick={onBack}><X className="w-5 h-5" /></Button>}
          <UserProfileDialog userId={avatarTargetId} onStartChat={onStartDirectChat}>
            <div className={cn(
                "flex items-center gap-3",
                chatId !== GLOBAL_CHAT_ID && chatData?.type === 'individual' && "cursor-pointer hover:opacity-80 transition-opacity"
              )}
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
          </UserProfileDialog>
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

      <ScrollArea className="flex-1 bg-sidebar/5">
        <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
          {messagesWithDates?.map((msg, idx) => {
            if (msg.type === 'date') {
              return (
                <div key={`date-${idx}`} className="flex justify-center my-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">
                    {msg.date}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderId === user?.uid;
            const showName = !isMe && chatData?.type !== 'individual';

            return (
              <div key={msg.id} className={cn("flex items-start gap-2 max-w-[85%] group/msg", isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row")}>
                {!isMe && (
                  <UserProfileDialog userId={msg.senderId} onStartChat={onStartDirectChat}>
                    <div className="cursor-pointer hover:opacity-80 transition-opacity shrink-0">
                      <UserAvatar userId={msg.senderId} fallback={msg.senderName} className="w-8 h-8 mt-1" />
                    </div>
                  </UserProfileDialog>
                )}
                
                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  {showName && <span className="text-[10px] font-bold text-primary px-1 mb-0.5">{msg.senderName}</span>}
                  
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
                        <div className="mb-2 p-2 rounded-lg bg-black/10 border-l-2 border-primary text-[10px] opacity-80 cursor-pointer">
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

                      {msg.type === 'audio' && msg.audioUrl && (
                        <div className="flex items-center gap-3 py-1 min-w-[200px]">
                          <audio controls src={msg.audioUrl} className="h-10 w-full" />
                        </div>
                      )}

                      {msg.type === 'poll' && msg.poll && (
                        <div className="space-y-3 min-w-[200px] py-1">
                          <p className="font-bold border-b pb-2 mb-2">{msg.poll.question}</p>
                          {msg.poll.options.map((opt: any, i: number) => {
                            const totalVotes = msg.poll.options.reduce((acc: number, o: any) => acc + (o.votes?.length || 0), 0);
                            const percent = totalVotes === 0 ? 0 : Math.round(((opt.votes?.length || 0) / totalVotes) * 100);
                            const hasVoted = opt.votes?.includes(user?.uid);

                            return (
                              <button 
                                key={i} 
                                onClick={() => handleVote(msg.id, i)}
                                className={cn(
                                  "w-full text-left p-2 rounded-xl border relative overflow-hidden transition-all active:scale-95",
                                  hasVoted ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                                )}
                              >
                                <div className="relative z-10 flex justify-between items-center text-xs">
                                  <span>{opt.text}</span>
                                  <span className="font-bold">{percent}%</span>
                                </div>
                                <div 
                                  className="absolute inset-0 bg-primary/10 transition-all" 
                                  style={{ width: `${percent}%` }}
                                />
                              </button>
                            );
                          })}
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

      <div className="p-4 bg-white/80 dark:bg-black/40 backdrop-blur-md border-t shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {isRecording ? (
            <div className="flex-1 flex items-center gap-4 bg-destructive/10 text-destructive p-2 rounded-full animate-pulse px-6 h-11">
              <StopCircle className="w-5 h-5" onClick={stopRecording} />
              <span className="text-xs font-bold font-mono">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase tracking-widest flex-1">Идет запись...</span>
              <Button size="icon" variant="ghost" onClick={stopRecording} className="text-destructive"><Send className="w-5 h-5" /></Button>
            </div>
          ) : (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full text-muted-foreground"><Paperclip className="w-5 h-5" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl" align="start">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><ImageIcon className="w-4 h-4 mr-2" />{t.photo}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPollDialogOpen(true)}><BarChart2 className="w-4 h-4 mr-2" />Опрос</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Input 
                placeholder={selectedImages.length > 0 ? "Добавьте подпись..." : t.message} 
                className="rounded-full bg-background border-none h-11" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              />
              {message.trim() || selectedImages.length > 0 ? (
                <Button className="rounded-full cove-gradient text-white h-11 w-11 p-0 shadow-lg shadow-primary/20" onClick={() => handleSend()} disabled={isSending}>
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              ) : (
                <Button className="rounded-full bg-primary/10 text-primary h-11 w-11 p-0" onClick={startRecording}>
                  <Mic className="w-5 h-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle>Создать опрос</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-60 ml-1">Вопрос</label>
              <Input placeholder="О чем спросим?" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase opacity-60 ml-1">Варианты ответа</label>
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
                  {pollOptions.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 10 && (
                <Button variant="ghost" className="w-full h-10 rounded-xl border-dashed border-2 text-[10px] font-bold uppercase" onClick={() => setPollOptions(prev => [...prev, ""])}>Добавить вариант</Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 rounded-2xl cove-gradient text-white font-bold" onClick={handlePollCreate}>Создать опрос</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MentionTrigger({ username, onStartChat, children }: { username: string; onStartChat?: (id: string) => void; children: React.ReactNode }) {
  const db = useFirestore();
  const [resolvedUserId, setResolvedUserId] = React.useState<string | null>(null);

  const handleTrigger = async () => {
    if (!db || resolvedUserId) return;
    try {
      const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) setResolvedUserId(snap.docs[0].id);
    } catch (e) { console.error(e); }
  };

  return (
    <span onMouseEnter={handleTrigger} onClick={handleTrigger}>
      {resolvedUserId ? (
        <UserProfileDialog userId={resolvedUserId} onStartChat={onStartChat}>{children}</UserProfileDialog>
      ) : children}
    </span>
  );
}