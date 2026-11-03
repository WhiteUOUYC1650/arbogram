"use client";

import * as React from 'react';
import {
  Search,
  Globe,
  LogOut,
  Settings as SettingsIcon,
  Pencil,
  Loader2,
  Info,
  ShieldAlert,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useAuth, useUser, useMemoFirebase, useDoc } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  limit,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { CreateChatDialog } from './create-chat-dialog';
import { StoriesBar } from '@/components/stories/stories-bar';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { UserAvatar } from '@/components/user-avatar';
import { SlinkLogo } from '@/components/slink-logo';
import { APP_NAME, APP_VERSION_LABEL } from '@/lib/brand';
import { translations, Language } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { UserProfileDialog } from './user-profile-dialog';
import { sendSystemNotification } from '@/lib/system-notifications';
import { ensureServiceChat, serviceChatId } from '@/lib/service-bot';
import { useAppSettings } from '@/lib/app-settings';

const GLOBAL_CHAT_ID = "p7gSC3o9OxVezsjDbrFq";

type ChatFilter = 'all' | 'direct' | 'groups' | 'channels';

interface ChatSidebarProps {
  activeChatId?: string;
  onChatSelect: (id: string) => void;
}

export function ChatSidebar({ activeChatId, onChatSelect }: ChatSidebarProps) {
  const [lang, setLang] = React.useState<Language>('ru');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<{ users: any[]; chats: any[] }>({
    users: [],
    chats: [],
  });
  const [isSearching, setIsSearching] = React.useState(false);
  const [filter, setFilter] = React.useState<ChatFilter>('all');
  const [isOpeningBot, setIsOpeningBot] = React.useState(false);

  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const settings = useAppSettings();

  React.useEffect(() => {
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  const userRef = useMemoFirebase(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user?.uid]);
  const { data: userData } = useDoc(userRef);
  const isAdmin =
    userData?.username?.toLowerCase() === '@nexus90kyt' ||
    userData?.username?.toLowerCase() === '@white';

  const myChatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
  }, [db, user?.uid]);

  const { data: myChats, loading: chatsLoading } = useCollection(myChatsQuery);

  const sortedChats = React.useMemo(() => {
    if (!myChats) return [];
    return [...myChats]
      .filter((c) => c.id !== GLOBAL_CHAT_ID && c.type !== 'service')
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  }, [myChats]);

  const filteredChats = React.useMemo(() => {
    if (filter === 'all') return sortedChats;
    const typeMap: Record<Exclude<ChatFilter, 'all'>, string> = {
      direct: 'individual',
      groups: 'group',
      channels: 'channel',
    };
    return sortedChats.filter((c) => c.type === typeMap[filter]);
  }, [sortedChats, filter]);

  const handleGlobalSearch = async (val: string) => {
    setSearchTerm(val);
    if (!db || val.length < 2) {
      setSearchResults({ users: [], chats: [] });
      return;
    }

    setIsSearching(true);
    try {
      const userQ = query(
        collection(db, 'users'),
        where('username', '>=', val.startsWith('@') ? val : '@' + val),
        where('username', '<=', (val.startsWith('@') ? val : '@' + val) + '\uf8ff'),
        limit(5),
      );

      const chatQ = query(
        collection(db, 'chats'),
        where('isPublic', '==', true),
        where('name', '>=', val),
        where('name', '<=', val + '\uf8ff'),
        limit(5),
      );

      const [userSnap, chatSnap] = await Promise.all([getDocs(userQ), getDocs(chatQ)]);

      setSearchResults({
        users: userSnap.docs
          .map((d) => ({ ...d.data(), id: d.id } as any))
          .filter((u) => u.uid !== user?.uid),
        chats: chatSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
      });
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenGlobalChat = async () => {
    if (!db || !user) return;
    try {
      const globalChatRef = doc(db, 'chats', GLOBAL_CHAT_ID);
      const snap = await getDoc(globalChatRef);

      if (snap.exists()) {
        const data = snap.data();
        if (!data.participants.includes(user.uid)) {
          await updateDoc(globalChatRef, { participants: arrayUnion(user.uid) });
          await sendSystemNotification(
            db,
            GLOBAL_CHAT_ID,
            `${userData?.displayName || 'Новый участник'} присоединился к общему чату`,
            'joined',
          );
        }
      }
      onChatSelect(GLOBAL_CHAT_ID);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenServiceChat = async () => {
    if (!db || !user || isOpeningBot) return;
    setIsOpeningBot(true);
    try {
      const id = await ensureServiceChat(db, user, userData?.displayName || user.displayName);
      if (id) onChatSelect(id);
    } catch (e) {
      console.error('Service chat error:', e);
    } finally {
      setIsOpeningBot(false);
    }
  };

  const filterChips: { key: ChatFilter; label: string }[] = [
    { key: 'all', label: t.filters.all },
    { key: 'direct', label: t.filters.direct },
    { key: 'groups', label: t.filters.groups },
    { key: 'channels', label: t.filters.channels },
  ];

  return (
    <div className="relative flex h-full flex-col bg-surface-low">
      {/* M3 top app bar + search */}
      <div className="shrink-0 space-y-3 border-b border-outline-variant/50 bg-surface-low/90 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <SlinkLogo className="h-10 w-10 transition-transform duration-300 hover:rotate-3" />
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-extrabold leading-none tracking-tight text-on-surface">
                {APP_NAME}
              </h1>
              <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                {t.messenger} · {APP_VERSION_LABEL}
              </p>
            </div>
          </div>

          <div className="-mr-1 flex shrink-0 items-center">
            {isAdmin && (
              <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full text-destructive">
                <Link href="/admin" aria-label="Админ-панель">
                  <ShieldAlert className="h-5 w-5" />
                </Link>
              </Button>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t.whatsNew}>
                  <Info className="h-5 w-5 text-on-surface-variant" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm rounded-[28px] border-none bg-surface-container p-0 shadow-m3-strong">
                <div className="relative overflow-hidden rounded-t-[28px] bg-primary-container px-6 pb-6 pt-7">
                  <div className="flex items-center gap-3">
                    <SlinkLogo className="h-12 w-12" />
                    <div>
                      <DialogTitle className="text-lg font-extrabold text-primary-on-container">
                        {APP_NAME}
                      </DialogTitle>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-on-container/70">
                        {APP_VERSION_LABEL} · {t.whatsNew}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 px-6 pb-6 pt-4">
                  <ul className="space-y-2">
                    {t.changelog.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-2xl bg-surface-high/70 px-3 py-2.5 text-xs font-medium leading-relaxed text-on-surface"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </DialogContent>
            </Dialog>

            <SettingsDialog>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t.settings}>
                <SettingsIcon className="h-5 w-5 text-on-surface-variant" />
              </Button>
            </SettingsDialog>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label={t.logout}
              onClick={() => auth && signOut(auth)}
            >
              <LogOut className="h-4 w-4 text-on-surface-variant/70" />
            </Button>
          </div>
        </div>

        <div className="group relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary" />
          <Input
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => handleGlobalSearch(e.target.value)}
            className="h-12 rounded-full border-none bg-surface-high pl-11 pr-10 text-[15px] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => handleGlobalSearch('')}
              aria-label="Очистить поиск"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-on-surface/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!searchTerm && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className={cn('m3-chip shrink-0', filter === chip.key && 'm3-chip-active')}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!searchTerm && settings.showStories && <StoriesBar onStartChat={onChatSelect} />}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-1 px-2 pb-24 pt-2">
          {searchTerm ? (
            <div className="space-y-5 p-1 animate-in fade-in duration-300">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center gap-2 p-10 opacity-60">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {searchResults.users.length > 0 && (
                    <div className="space-y-1">
                      <p className="m3-label px-3 pb-1">{t.people}</p>
                      {searchResults.users.map((u) => (
                        <UserProfileDialog key={u.id} userId={u.uid} onStartChat={onChatSelect}>
                          <div className="m3-state flex cursor-pointer items-center gap-3 rounded-2xl p-2.5">
                            <UserAvatar userId={u.uid} fallback={u.displayName} className="h-11 w-11" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-on-surface">{u.displayName}</p>
                              <p className="truncate font-mono text-xs text-primary">{u.username}</p>
                            </div>
                            <MessageSquare className="h-4 w-4 text-on-surface-variant" />
                          </div>
                        </UserProfileDialog>
                      ))}
                    </div>
                  )}

                  {searchResults.chats.length > 0 && (
                    <div className="space-y-1">
                      <p className="m3-label px-3 pb-1">{t.chatsAndChannels}</p>
                      {searchResults.chats.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => onChatSelect(c.id)}
                          className="m3-state flex cursor-pointer items-center gap-3 rounded-2xl p-2.5"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container text-secondary-on-container">
                            <Globe className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-on-surface">{c.name}</p>
                            <p className="text-[11px] uppercase tracking-wide text-on-surface-variant">
                              {c.type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isSearching && searchResults.users.length === 0 && searchResults.chats.length === 0 && (
                    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
                        <Search className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-on-surface-variant">{t.emptySearch}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenServiceChat}
                aria-label="Служебные уведомления SLink"
                className={cn(
                  'anim-fade-up mb-2 flex w-full items-center gap-3 rounded-3xl border p-2.5 text-left transition-colors',
                  activeChatId === serviceChatId(user?.uid || '')
                    ? 'border-transparent bg-primary-container'
                    : 'border-outline-variant/50 bg-surface-low hover:bg-on-surface/[0.05] active:bg-on-surface/[0.09]',
                )}
              >
                <SlinkLogo className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-on-surface">SLink</p>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {isOpeningBot ? '…' : 'БОТ'}
                    </span>
                  </div>
                  <p className="truncate text-xs text-on-surface-variant">Служебные уведомления</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenGlobalChat}
                className={cn(
                  'anim-fade-up anim-delay-1 mb-2 flex w-full items-center gap-3 rounded-3xl border border-transparent p-2.5 text-left transition-colors',
                  activeChatId === GLOBAL_CHAT_ID
                    ? 'bg-secondary-container'
                    : 'border-outline-variant/50 bg-secondary-container/40 hover:bg-secondary-container/60',
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm">
                  <Globe className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-secondary-on-container">
                      {t.globalChat}
                    </p>
                    <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary">
                      {t.public}
                    </span>
                  </div>
                  <p className="truncate text-xs text-secondary-on-container/70">{t.globalChatHint}</p>
                </div>
              </button>

              {chatsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary opacity-60" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-outline-variant px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-on-surface-variant">{t.emptyChats}</p>
                </div>
              ) : (
                filteredChats.map((chat: any, index: number) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    user={user}
                    isActive={activeChatId === chat.id}
                    compact={settings.compactChats}
                    animationDelay={Math.min(index, 10) * 35}
                    onSelect={() => onChatSelect(chat.id)}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 right-5 z-20">
        <CreateChatDialog onChatCreated={onChatSelect}>
          <Button
            className="pointer-events-auto h-16 w-16 rounded-[24px] bg-primary p-0 text-primary-foreground shadow-m3-strong transition-transform hover:scale-105 active:scale-95"
            aria-label={t.newChat}
          >
            <Pencil className="h-6 w-6" />
          </Button>
        </CreateChatDialog>
      </div>
    </div>
  );
}

function ChatItem({
  chat,
  user,
  isActive,
  compact = false,
  animationDelay = 0,
  onSelect,
}: {
  chat: any;
  user: any;
  isActive: boolean;
  compact?: boolean;
  animationDelay?: number;
  onSelect: () => void;
}) {
  const db = useFirestore();
  let displayName = chat.name || 'Группа';
  let targetId = chat.id;

  if (chat.type === 'individual' && user) {
    const otherId = chat.participants.find((p: string) => p !== user.uid);
    if (otherId && chat.metadata?.[otherId]) {
      displayName = chat.metadata[otherId].displayName;
      targetId = otherId;
    }
  }

  const userRef = useMemoFirebase(
    () => (db && targetId !== chat.id && targetId !== GLOBAL_CHAT_ID ? doc(db, 'users', targetId) : null),
    [db, targetId, chat.id],
  );
  const { data: targetUserData } = useDoc(userRef);

  const isOnline = targetUserData?.status === 'online';
  const lastMessage = chat.lastMessage || 'Нет сообщений';

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={cn(
        'anim-fade-up flex w-full items-center gap-3 rounded-3xl text-left transition-colors duration-200',
        compact ? 'p-2' : 'p-2.5',
        isActive ? 'bg-primary-container' : 'hover:bg-on-surface/[0.05] active:bg-on-surface/[0.09]',
      )}
    >
      <div className="relative shrink-0">
        {chat.type === 'group' || chat.type === 'channel' ? (
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-tertiary-container text-tertiary-on-container',
              compact ? 'h-10 w-10' : 'h-12 w-12',
            )}
          >
            {chat.type === 'channel' ? <Globe className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
          </div>
        ) : (
          <UserAvatar
            userId={targetId}
            fallback={displayName}
            className={compact ? 'h-10 w-10' : 'h-12 w-12'}
          />
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-surface-low bg-success" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              'truncate text-[15px] font-semibold',
              isActive ? 'text-primary-on-container' : 'text-on-surface',
            )}
          >
            {displayName}
          </p>
          <span
            className={cn(
              'shrink-0 text-[11px] font-medium',
              isActive ? 'text-primary-on-container/70' : 'text-on-surface-variant',
            )}
          >
            {chat.lastMessageTime
              ? new Date(chat.lastMessageTime).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
        </div>
        <p
          className={cn(
            'mt-0.5 truncate text-[13px]',
            isActive ? 'text-primary-on-container/80' : 'text-on-surface-variant',
          )}
        >
          {lastMessage}
        </p>
      </div>
    </button>
  );
}
