"use client";

import * as React from 'react';
import {
  Send,
  Paperclip,
  X,
  MoreVertical,
  Reply,
  Smile,
  Globe,
  Mic,
  StopCircle,
  BarChart2,
  MessageSquarePlus,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, updateDoc, getDoc, arrayRemove, limit } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { SlinkLogo } from '@/components/slink-logo';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { translations, Language } from '@/lib/i18n';
import { UserProfileDialog } from './user-profile-dialog';
import { SystemMessage } from './system-message';
import { sendSystemNotification } from '@/lib/system-notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const GLOBAL_CHAT_ID = 'p7gSC3o9OxVezsjDbrFq';

interface ChatWindowProps {
  chatId: string;
  onBack?: () => void;
  onStartDirectChat?: (userId: string) => void;
}

export function ChatWindow({ chatId, onBack, onStartDirectChat }: ChatWindowProps) {
  const [message, setMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const [replyTo, setReplyTo] = React.useState<any>(null);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = React.useState(false);
  const [pollDialogOpen, setPollDialogOpen] = React.useState(false);
  const [pollQuestion, setPollQuestion] = React.useState('');
  const [pollOptions, setPollOptions] = React.useState(['', '']);

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];
  const chatRef = useMemoFirebase(() => (db ? doc(db, 'chats', chatId) : null), [db, chatId]);
  const { data: chatData } = useDoc(chatRef);

  // Определяем ID собеседника для личного чата
  const otherParticipantId = React.useMemo(() => {
    if (!chatData || chatData.type !== 'individual' || !user) return null;
    return chatData.participants.find((p: string) => p !== user.uid);
  }, [chatData, user]);

  const otherUserRef = useMemoFirebase(
    () => (db && otherParticipantId ? doc(db, 'users', otherParticipantId) : null),
    [db, otherParticipantId],
  );
  const { data: otherUserData } = useDoc(otherUserRef);

  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
  }, [db, chatId]);
  const { data: rawMessages } = useCollection(messagesQuery);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawMessages]);

  const handleSend = async (
    options: { audioUrl?: string; duration?: number; poll?: any; sticker?: { id: string; packId: string } } = {},
  ) => {
    const { audioUrl, duration, poll, sticker } = options;
    if (!message.trim() && selectedImages.length === 0 && !audioUrl && !poll && !sticker) return;
    if (!db || !user) return;

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || 'User',
      timestamp: Date.now(),
      type: sticker
        ? 'sticker'
        : poll
          ? 'poll'
          : audioUrl
            ? 'audio'
            : selectedImages.length > 0
              ? 'image'
              : 'text',
      text: message.trim() || null,
      imageUrls: selectedImages.length > 0 ? selectedImages : null,
      audioUrl: audioUrl || null,
      duration: duration || null,
      poll: poll || null,
      stickerId: sticker?.id || null,
      packId: sticker?.packId || null,
      replyTo: replyTo
        ? { id: replyTo.id, text: replyTo.text || 'Вложение', senderName: replyTo.senderName }
        : null,
    };

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);
      let last = msgData.text || 'Вложение';
      if (sticker) last = '🎨 Стикер';
      if (poll) last = '📊 Опрос';
      if (audioUrl) last = '🎤 Голосовое сообщение';
      await updateDoc(chatRef!, { lastMessage: last, lastMessageTime: Date.now() });
      setMessage('');
      setSelectedImages([]);
      setReplyTo(null);
      setStickerPickerOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Ошибка отправки' });
    } finally {
      setIsSending(false);
    }
  };

  const handleVote = async (msgId: string, optionIndex: number) => {
    if (!db || !user) return;
    const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;

    const poll = snap.data().poll;
    const votes = poll.votes || {};
    votes[user.uid] = optionIndex;

    await updateDoc(msgRef, { 'poll.votes': votes });
  };

  const handleLeaveChat = async () => {
    if (!db || !user || !chatRef) return;
    try {
      await sendSystemNotification(
        db,
        chatId,
        `${user.displayName || 'Пользователь'} покинул(а) чат`,
        'left',
      );
      await updateDoc(chatRef, { participants: arrayRemove(user.uid) });
      toast({ title: 'Вы покинули чат' });
      onBack?.();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Не удалось покинуть чат' });
    }
  };

  const renderDateSeparator = (timestamp: number, prevTimestamp?: number) => {
    const date = new Date(timestamp);
    const prevDate = prevTimestamp ? new Date(prevTimestamp) : null;

    if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
      let label = format(date, 'd MMMM yyyy', { locale: lang === 'ru' ? ru : enUS });
      const now = new Date();
      if (date.toDateString() === now.toDateString()) label = t.today;
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) label = t.yesterday;

      return (
        <div className="flex justify-center py-3">
          <span className="rounded-full bg-surface-high px-3.5 py-1 text-[11px] font-semibold text-on-surface-variant">
            {label}
          </span>
        </div>
      );
    }
    return null;
  };

  const getChatTitle = () => {
    if (chatId === GLOBAL_CHAT_ID) return t.globalChat;
    if (chatData?.type === 'individual') return otherUserData?.displayName || 'Чат';
    return chatData?.name || 'Группа';
  };

  const getChatStatus = () => {
    if (chatId === GLOBAL_CHAT_ID) return `${t.public} · SLink`;
    if (chatData?.type === 'individual') {
      return otherUserData?.status === 'online' ? t.online : t.offline;
    }
    return `${chatData?.participants?.length || 0} ${t.members}`;
  };

  const targetId = chatData?.type === 'individual' ? otherParticipantId : chatId;
  const isIndividualOnline = chatData?.type === 'individual' && otherUserData?.status === 'online';

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      {/* M3 top app bar */}
      <header className="z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant/60 bg-surface-low/95 px-2 backdrop-blur-xl md:px-4">
        <div className="flex min-w-0 items-center gap-1">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label="Закрыть чат"
              className="shrink-0 rounded-full text-on-surface-variant"
            >
              <X className="h-5 w-5" />
            </Button>
          )}

          <UserProfileDialog userId={targetId || ''} onStartChat={() => {}}>
            <div className="flex min-w-0 cursor-pointer items-center gap-3 rounded-full pr-2 transition-colors hover:bg-on-surface/5">
              <div className="relative shrink-0">
                {chatId === GLOBAL_CHAT_ID ? (
                  <div className="slink-gradient flex h-10 w-10 items-center justify-center rounded-full text-white">
                    <Globe className="h-5 w-5" />
                  </div>
                ) : (
                  <UserAvatar userId={targetId || ''} className="h-10 w-10" />
                )}
                {isIndividualOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface-low bg-success" />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <h2 className="truncate text-[15px] font-bold leading-tight text-on-surface">
                  {getChatTitle()}
                </h2>
                <span
                  className={cn(
                    'truncate text-[11px] font-medium',
                    isIndividualOnline ? 'text-success' : 'text-on-surface-variant',
                  )}
                >
                  {getChatStatus()}
                </span>
              </div>
            </div>
          </UserProfileDialog>
        </div>

        <div className="flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Меню чата">
                <MoreVertical className="h-5 w-5 text-on-surface-variant" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-3xl border-outline-variant/60 p-2">
              <DropdownMenuItem
                className="gap-2 rounded-2xl py-2.5 text-destructive focus:text-destructive"
                onClick={handleLeaveChat}
              >
                <LogOut className="h-4 w-4" /> {t.leave}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 md:px-6">
        <div className="mx-auto w-full max-w-3xl py-2">
          {!rawMessages?.length && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <SlinkLogo className="h-16 w-16 opacity-90" />
              <div className="space-y-1">
                <p className="text-base font-bold text-on-surface">{getChatTitle()}</p>
                <p className="text-sm text-on-surface-variant">
                  Сообщений пока нет — отправьте первое.
                </p>
              </div>
            </div>
          )}

          {rawMessages?.map((msg: any, i: number) => {
            const mine = msg.senderId === user?.uid;
            const showSender = !mine && (chatData?.type !== 'individual' || chatId === GLOBAL_CHAT_ID);

            // Служебные уведомления живут отдельной строкой по центру ленты
            if (msg.type === 'system') {
              return (
                <React.Fragment key={msg.id}>
                  {renderDateSeparator(msg.timestamp, rawMessages[i - 1]?.timestamp)}
                  <SystemMessage text={msg.text} kind={msg.systemKind} timestamp={msg.timestamp} />
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={msg.id}>
                {renderDateSeparator(msg.timestamp, rawMessages[i - 1]?.timestamp)}
                <div
                  className={cn(
                    'animate-message-in mb-2.5 flex max-w-[88%] items-end gap-2 md:max-w-[75%]',
                    mine ? 'ml-auto flex-row-reverse' : 'mr-auto',
                  )}
                >
                  {!mine && (
                    <UserProfileDialog userId={msg.senderId} onStartChat={onStartDirectChat}>
                      <UserAvatar
                        userId={msg.senderId}
                        fallback={msg.senderName}
                        className="mt-1 h-8 w-8 shrink-0 cursor-pointer"
                      />
                    </UserProfileDialog>
                  )}

                  <div className={cn('flex min-w-0 flex-col gap-1', mine ? 'items-end' : 'items-start')}>
                    {showSender && (
                      <span className="ml-1 text-[11px] font-semibold text-primary">
                        {msg.senderName}
                      </span>
                    )}

                    <div
                      className={cn(
                        'relative min-w-0 rounded-[20px] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm',
                        mine
                          ? 'rounded-br-md bg-primary-container text-primary-on-container'
                          : 'rounded-bl-md bg-surface-high text-on-surface',
                      )}
                    >
                      {msg.replyTo && (
                        <div className="mb-2 rounded-xl border-l-2 border-current/40 bg-on-surface/5 px-2.5 py-1.5 text-[11px]">
                          <p className="font-bold opacity-70">{msg.replyTo.senderName}</p>
                          <p className="truncate opacity-90">{msg.replyTo.text}</p>
                        </div>
                      )}

                      {msg.type === 'sticker' && (
                        <StickerRenderer packId={msg.packId} stickerId={msg.stickerId} />
                      )}

                      {msg.type === 'image' && msg.imageUrls?.length > 0 && (
                        <div className="mb-1 grid grid-cols-2 gap-1.5">
                          {msg.imageUrls.map((src: string, idx: number) => (
                            <img
                              key={idx}
                              src={src}
                              alt="Вложение"
                              className="max-h-56 w-full rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      )}

                      {msg.type === 'poll' && msg.poll && (
                        <div className="min-w-[200px] space-y-3">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            <BarChart2 className="h-4 w-4" /> {msg.poll.question}
                          </p>
                          <div className="space-y-2">
                            {msg.poll.options.map((opt: string, idx: number) => {
                              const votes = Object.values(msg.poll.votes || {});
                              const count = votes.filter((v) => v === idx).length;
                              const percent = votes.length > 0 ? (count / votes.length) * 100 : 0;
                              const isVoted = msg.poll.votes?.[user?.uid!] === idx;

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleVote(msg.id, idx)}
                                  className={cn(
                                    'relative w-full overflow-hidden rounded-xl border p-2 text-left transition-all',
                                    isVoted
                                      ? 'border-primary bg-primary/10'
                                      : 'border-outline-variant/60 bg-surface-lowest/40',
                                  )}
                                >
                                  <div
                                    className="absolute inset-0 bg-primary/15 transition-all"
                                    style={{ width: `${percent}%` }}
                                  />
                                  <div className="relative flex justify-between text-xs font-medium">
                                    <span>{opt}</span>
                                    <span>{Math.round(percent)}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-center text-[10px] opacity-60">
                            {Object.keys(msg.poll.votes || {}).length} проголосовало
                          </p>
                        </div>
                      )}

                      {msg.type === 'audio' && (
                        <div className="flex min-w-[150px] items-center gap-2">
                          <audio controls className="h-9 w-44">
                            <source src={msg.audioUrl} type="audio/webm" />
                          </audio>
                        </div>
                      )}

                      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-[10px]',
                          mine ? 'text-primary-on-container/60' : 'text-on-surface-variant',
                        )}
                      >
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {msg.type !== 'sticker' && (
                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo({
                            id: msg.id,
                            text: msg.text || 'Вложение',
                            senderName: msg.senderName,
                          })
                        }
                        className="flex items-center gap-1 px-1 text-[10px] font-medium text-on-surface-variant/80 transition-colors hover:text-primary"
                      >
                        <Reply className="h-3 w-3" /> {t.reply}
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </div>

      {stickerPickerOpen && (
        <StickerPicker
          onSelect={(s) => {
            handleSend({ sticker: s });
          }}
        />
      )}

      {/* Composer */}
      <div className="safe-bottom shrink-0 border-t border-outline-variant/60 bg-surface-low/95 px-3 pb-3 pt-2 backdrop-blur-xl md:px-4">
        <div className="mx-auto w-full max-w-3xl">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-2xl bg-surface-high px-3 py-2 text-xs animate-in slide-in-from-bottom-2">
              <div className="flex min-w-0 items-center gap-2">
                <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-on-surface">{replyTo.senderName}</p>
                  <p className="truncate text-on-surface-variant">{replyTo.text || 'Вложение'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-full"
                onClick={() => setReplyTo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-1 md:gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-full text-on-surface-variant"
                  aria-label="Вложения"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-52 rounded-3xl p-2">
                <DropdownMenuItem
                  className="cursor-pointer gap-3 rounded-2xl py-2.5"
                  onClick={() => setPollDialogOpen(true)}
                >
                  <BarChart2 className="h-4 w-4 text-primary" /> Опрос
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-3 rounded-2xl py-2.5"
                  onClick={() => setStickerPickerOpen((v) => !v)}
                >
                  <Smile className="h-4 w-4 text-secondary" /> Стикеры
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStickerPickerOpen(!stickerPickerOpen)}
              className="hidden h-12 w-12 shrink-0 rounded-full text-on-surface-variant sm:inline-flex"
              aria-label="Стикеры"
            >
              <Smile className="h-5 w-5" />
            </Button>

            <div className="relative min-w-0 flex-1">
              <Input
                placeholder={t.message}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="h-12 rounded-3xl border-none bg-surface-high px-4 text-[15px] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>

            {message.trim() ? (
              <Button
                className="h-12 w-12 shrink-0 rounded-2xl bg-primary p-0 text-primary-foreground shadow-m3 transition-transform active:scale-95"
                onClick={() => handleSend()}
                disabled={isSending}
                aria-label="Отправить"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <VoiceRecorder onSend={(url) => handleSend({ audioUrl: url })} />
            )}
          </div>
        </div>
      </div>

      <Dialog open={pollDialogOpen} onOpenChange={setPollDialogOpen}>
        <DialogContent className="max-w-sm rounded-[28px] border-none bg-surface-container p-6 shadow-m3-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <MessageSquarePlus className="h-5 w-5 text-primary" /> Создать опрос
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Ваш вопрос…"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="m3-field"
            />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Вариант ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    className="h-11 rounded-2xl border-none bg-surface-high"
                  />
                  {pollOptions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                className="w-full rounded-2xl text-xs font-semibold text-primary"
                onClick={() => setPollOptions([...pollOptions, ''])}
              >
                + Добавить вариант
              </Button>
            </div>
            <Button
              className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground"
              onClick={() => {
                handleSend({
                  poll: { question: pollQuestion, options: pollOptions.filter((o) => o.trim()), votes: {} },
                });
                setPollDialogOpen(false);
                setPollQuestion('');
                setPollOptions(['', '']);
              }}
            >
              Создать опрос
            </Button>
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
        reader.onloadend = () => onSend(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } catch (err) {
      alert('Доступ к микрофону отклонен');
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
    <div className="flex shrink-0 items-center gap-2">
      {isRecording && (
        <span className="animate-pulse font-mono text-[10px] text-destructive">
          {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-12 w-12 rounded-full transition-all',
          isRecording
            ? 'scale-105 bg-destructive text-destructive-foreground'
            : 'text-on-surface-variant hover:bg-on-surface/5',
        )}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={(e) => {
          e.preventDefault();
          startRecording();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          stopRecording();
        }}
        aria-label="Голосовое сообщение"
      >
        {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
    </div>
  );
}

function StickerPicker({ onSelect }: { onSelect: (s: { id: string; packId: string }) => void }) {
  const db = useFirestore();
  const packsQuery = query(collection(db!, 'stickerPacks'), orderBy('createdAt', 'desc'), limit(20));
  const { data: packs } = useCollection(packsQuery);

  return (
    <div className="flex h-64 shrink-0 flex-col border-t border-outline-variant/60 bg-surface-low animate-in slide-in-from-bottom">
      <Tabs defaultValue={packs?.[0]?.id || 'none'} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="no-scrollbar h-11 justify-start gap-2 overflow-x-auto border-none bg-transparent px-4">
          {packs?.map((p) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              className="h-8 rounded-full px-4 text-xs data-[state=active]:bg-secondary-container data-[state=active]:text-secondary-on-container"
            >
              {p.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1 overflow-y-auto p-4">
          {packs?.map((p) => (
            <TabsContent key={p.id} value={p.id} className="mt-0 grid grid-cols-4 gap-3 sm:grid-cols-6">
              <StickerList packId={p.id} onSelect={onSelect} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

function StickerList({ packId, onSelect }: { packId: string; onSelect: any }) {
  const db = useFirestore();
  const stickersQuery = query(collection(db!, 'stickerPacks', packId, 'stickers'));
  const { data: stickers } = useCollection(stickersQuery);
  return (
    <>
      {stickers?.map((s) => (
        <div
          key={s.id}
          onClick={() => onSelect({ id: s.id, packId })}
          className="m3-state cursor-pointer rounded-2xl p-2 transition-transform hover:scale-105 active:scale-95"
        >
          <StickerRenderer packId={packId} stickerId={s.id} />
        </div>
      ))}
    </>
  );
}

function StickerRenderer({ packId, stickerId }: { packId: string; stickerId: string }) {
  const db = useFirestore();
  const chunksQuery = query(
    collection(db!, 'stickerPacks', packId, 'stickers', stickerId, 'chunks'),
    orderBy('index', 'asc'),
  );
  const { data: chunks } = useCollection(chunksQuery);
  const fullData = React.useMemo(() => chunks?.map((c) => c.data).join('') || null, [chunks]);

  if (!fullData) return <div className="h-16 w-16 animate-pulse rounded-lg bg-surface-high" />;
  return <img src={fullData} className="h-24 w-24 object-contain" alt="Sticker" />;
}
