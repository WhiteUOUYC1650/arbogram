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
  Play,
  Pause,
  Check,
  Trash2,
  Lock,
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
import { SERVICE_BOT_ID, isServiceChatId } from '@/lib/service-bot';
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
    if (isServiceChat) return 'SLink';
    if (isGlobalChat) return t.globalChat;
    if (chatData?.type === 'individual') return otherUserData?.displayName || 'Чат';
    return chatData?.name || 'Группа';
  };

  const getChatStatus = () => {
    if (isServiceChat) return 'Служебный аккаунт · только уведомления';
    if (isGlobalChat) return `${t.public} · SLink`;
    if (chatData?.type === 'individual') {
      return otherUserData?.status === 'online' ? t.online : t.offline;
    }
    return `${chatData?.participants?.length || 0} ${t.members}`;
  };

  const targetId = chatData?.type === 'individual' ? otherParticipantId : chatId;
  const isIndividualOnline = chatData?.type === 'individual' && otherUserData?.status === 'online';
  const isServiceChat = isServiceChatId(chatId) || Boolean(chatData?.isService);
  const isGlobalChat = chatId === GLOBAL_CHAT_ID;

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

          {isServiceChat ? (
            <div className="flex min-w-0 cursor-pointer items-center gap-3 rounded-full pr-2 transition-colors cursor-default hover:bg-transparent">
              <div className="relative shrink-0">
                {isServiceChat ? (
                  <SlinkLogo className="h-10 w-10 rounded-full" />
                ) : chatId === GLOBAL_CHAT_ID ? (
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
          ) : (
            <UserProfileDialog userId={targetId || ''} onStartChat={() => {}}>
            <div className="flex min-w-0 cursor-pointer items-center gap-3 rounded-full pr-2 transition-colors hover:bg-on-surface/5">
              <div className="relative shrink-0">
                {isServiceChat ? (
                  <SlinkLogo className="h-10 w-10 rounded-full" />
                ) : chatId === GLOBAL_CHAT_ID ? (
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
          )}
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
            const showSender =
              !mine &&
              (chatData?.type !== 'individual' || chatId === GLOBAL_CHAT_ID) &&
              rawMessages[i - 1]?.senderId !== msg.senderId;

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
                  {!mine &&
                    (msg.senderId === SERVICE_BOT_ID ? (
                      <SlinkLogo className="mt-1 h-8 w-8 shrink-0 rounded-full" />
                    ) : (
                      <UserProfileDialog userId={msg.senderId} onStartChat={onStartDirectChat}>
                        <UserAvatar
                          userId={msg.senderId}
                          fallback={msg.senderName}
                          className="mt-1 h-8 w-8 shrink-0 cursor-pointer"
                        />
                      </UserProfileDialog>
                    ))}

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

                      {msg.type === 'audio' && msg.audioUrl && (
                        <VoiceMessage src={msg.audioUrl} duration={msg.duration} mine={mine} />
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

                    {msg.type !== 'sticker' && msg.senderId !== SERVICE_BOT_ID && (
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

      {/* Composer: в служебном чате отвечать нельзя */}
      {isServiceChat ? (
        <div className="safe-bottom shrink-0 border-t border-outline-variant/60 bg-surface-low/95 px-4 py-4 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 rounded-full bg-surface-high px-4 py-3 text-center text-xs font-medium text-on-surface-variant">
            <Lock className="h-4 w-4 shrink-0 text-primary" />
            Служебный чат — здесь только уведомления, отвечать нельзя
          </div>
        </div>
      ) : (
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
              <VoiceRecorder onSend={({ url, duration }) => handleSend({ audioUrl: url, duration })} />
            )}
          </div>
        </div>
      </div>

      )}

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

/** Плеер голосового сообщения в стиле M3: play/pause, «волна» и длительность. */
function VoiceMessage({ src, duration, mine }: { src: string; duration?: number | null; mine?: boolean }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const bars = React.useMemo(() => Array.from({ length: 26 }, (_, i) => 5 + ((i * 7) % 14)), []);
  const total = duration || 0;

  const activeBar = mine ? 'bg-primary-on-container' : 'bg-primary';
  const inactiveBar = mine ? 'bg-primary-on-container/40' : 'bg-primary/30';

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const formatTime = (value: number) => {
    const seconds = Math.max(0, Math.round(value));
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const remaining = total ? Math.max(0, total - progress * total) : 0;

  return (
    <div className="flex min-w-[190px] max-w-[250px] items-center gap-2.5">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(event) => {
          const el = event.currentTarget;
          if (Number.isFinite(el.duration) && el.duration > 0) {
            setProgress(el.currentTime / el.duration);
          } else if (total) {
            setProgress(Math.min(1, el.currentTime / total));
          }
        }}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? 'Пауза' : 'Слушать голосовое'}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
          mine
            ? 'bg-primary-on-container/15 text-primary-on-container hover:bg-primary-on-container/25'
            : 'bg-primary/10 text-primary hover:bg-primary/20',
        )}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="flex flex-1 items-center gap-[3px]" aria-hidden>
        {bars.map((height, index) => (
          <span
            key={index}
            style={{ height }}
            className={cn(
              'w-[3px] rounded-full transition-colors',
              index / bars.length <= progress ? activeBar : inactiveBar,
            )}
          />
        ))}
      </div>

      <span className="shrink-0 text-[10px] tabular-nums opacity-70">
        {isPlaying ? formatTime(remaining) : formatTime(total)}
      </span>
    </div>
  );
}

/**
 * Запись голосового: тап по микрофону → запись, затем «отправить» или «отменить».
 * Длительность ограничена 90 секундами, а размер — лимитом документа Firestore.
 */
function VoiceRecorder({ onSend }: { onSend: (payload: { url: string; duration: number }) => void }) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = React.useRef(0);
  const cancelledRef = React.useRef(false);

  const MAX_SECONDS = 90;
  // base64 «весит» примерно на треть больше бинарника, а документ Firestore — 1 МБ
  const MAX_DATA_URL_LENGTH = 900_000;

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const pickMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
  };

  const stopRecording = (cancel = false) => {
    cancelledRef.current = cancel;
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      clearTimer();
      releaseStream();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      secondsRef.current = 0;
      setSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const recordedSeconds = secondsRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });

        clearTimer();
        releaseStream();
        setIsRecording(false);

        if (wasCancelled || blob.size === 0) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          if (url.length > MAX_DATA_URL_LENGTH) {
            toast({
              variant: 'destructive',
              title: 'Слишком длинное голосовое',
              description: `Максимум ${MAX_SECONDS} секунд.`,
            });
            return;
          }
          onSend({ url, duration: recordedSeconds });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(250);
      setIsRecording(true);

      intervalRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) stopRecording(false);
      }, 1000);
    } catch {
      clearTimer();
      releaseStream();
      setIsRecording(false);
      toast({
        variant: 'destructive',
        title: 'Нет доступа к микрофону',
        description: 'Разрешите доступ к микрофону в настройках браузера.',
      });
    }
  };

  React.useEffect(() => () => {
    clearTimer();
    releaseStream();
  }, []);

  const formatTime = (value: number) =>
    `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`;

  if (isRecording) {
    return (
      <div className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 pl-3 pr-1">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
        <span className="font-mono text-[11px] font-semibold text-destructive">
          {formatTime(seconds)}
        </span>
        <div className="mx-1 flex items-end gap-[2px]" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-[3px] animate-pulse rounded-full bg-destructive/60"
              style={{ height: 6 + ((i * 5) % 14), animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-destructive"
          onClick={() => stopRecording(true)}
          aria-label="Отменить запись"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground"
          onClick={() => stopRecording(false)}
          aria-label="Отправить голосовое"
        >
          <Check className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-12 w-12 shrink-0 rounded-full text-on-surface-variant hover:bg-on-surface/5"
      onClick={startRecording}
      aria-label="Записать голосовое сообщение"
    >
      <Mic className="h-5 w-5" />
    </Button>
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
