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
  Folder,
  FolderPlus,
  Archive,
  Trash2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { UserProfileDialog } from './user-profile-dialog';
import { sendSystemNotification } from '@/lib/system-notifications';
import { ensureServiceChat, serviceChatId } from '@/lib/service-bot';
import { useAppSettings } from '@/lib/app-settings';
import { useUserPrefs, type ChatFolder } from '@/lib/user-prefs';

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
  const { toast } = useToast();
  const { prefs, setFolders } = useUserPrefs();
  const [showArchive, setShowArchive] = React.useState(false);
  const [activeFolderId, setActiveFolderId] = React.useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState('');
  const [folderChatIds, setFolderChatIds] = React.useState<string[]>([]);
  const [editingFolderId, setEditingFolderId] = React.useState<string | null>(null);

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
  const seenMessageTimes = React.useRef<Record<string, number>>({});

  // Локальные уведомления о новых сообщениях (foreground).
  // Настоящий background push требует FCM + серверных ключей.
  React.useEffect(() => {
    if (!settings.notifications) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    for (const chat of myChats || []) {
      const time = Number(chat.lastMessageTime || 0);
      const previous = seenMessageTimes.current[chat.id];
      seenMessageTimes.current[chat.id] = Math.max(previous ?? 0, time);

      if (!previous || time <= previous) continue;
      if (chat.id === activeChatId) continue;
      if (!chat.lastMessage || String(chat.lastMessage).startsWith('🎞')) continue;

      try {
        new Notification(chat.name || 'SLink', {
          body: String(chat.lastMessage),
          tag: chat.id,
          icon: '/icons/SLinkBetaLogo.png',
        });
      } catch {
        // браузер может запретить уведомление
      }
    }
  }, [myChats, settings.notifications, activeChatId]);

  const sortedChats = React.useMemo(() => {
    if (!myChats) return [];
    return [...myChats]
      .filter((c) => c.id !== GLOBAL_CHAT_ID && c.type !== 'service')
      .sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  }, [myChats]);

  const activeFolder = React.useMemo(
    () => prefs.folders.find((folder) => folder.id === activeFolderId) ?? null,
    [prefs.folders, activeFolderId],
  );

  const baseChats = React.useMemo(() => {
    const archived = new Set(prefs.archivedChatIds);
    return sortedChats.filter((chat) =>
      showArchive ? archived.has(chat.id) : !archived.has(chat.id),
    );
  }, [sortedChats, prefs.archivedChatIds, showArchive]);

  const filteredChats = React.useMemo(() => {
    if (filter === 'all') return baseChats;
    const typeMap: Record<Exclude<ChatFilter, 'all'>, string> = {
      direct: 'individual',
      groups: 'group',
      channels: 'channel',
    };
    return sortedChats.filter((c) => c.type === typeMap[filter]);
  }, [baseChats, filter]);

  const visibleChats = React.useMemo(() => {
    if (!activeFolder) return filteredChats;
    return baseChats.filter((chat) => activeFolder.chatIds.includes(chat.id));
  }, [activeFolder, filteredChats, baseChats]);

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
    } catch (e: any) {
      console.error('Search error:', e);
      setSearchResults({ users: [], chats: [] });
      toast({
        variant: 'destructive',
        title: 'Поиск недоступен',
        description: 'Firestore отклонил запрос. Проверьте составные индексы (docs/firestore-indexes.md).',
      });
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

  const openFolderDialog = (folder?: ChatFolder) => {
    setEditingFolderId(folder?.id ?? null);
    setFolderName(folder?.name ?? '');
    setFolderChatIds(folder?.chatIds ?? []);
    setFolderDialogOpen(true);
  };

  const toggleFolderChat = (chatId: string) => {
    setFolderChatIds((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId],
    );
  };

  const saveFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Введите название папки' });
      return;
    }

    try {
      if (editingFolderId) {
        await setFolders(
          prefs.folders.map((folder) =>
            folder.id === editingFolderId ? { ...folder, name, chatIds: folderChatIds } : folder,
          ),
        );
      } else {
        const folder: ChatFolder = {
          id: `f_${Date.now().toString(36)}`,
          name,
          chatIds: folderChatIds,
        };
        await setFolders([...prefs.folders, folder]);
        setActiveFolderId(folder.id);
      }
      toast({ title: 'Папка сохранена' });
      setFolderDialogOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось сохранить папку' });
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      await setFolders(prefs.folders.filter((folder) => folder.id !== id));
      if (activeFolderId === id) setActiveFolderId(null);
      toast({ title: 'Папка удалена' });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось удалить папку' });
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
                onClick={() => {
                  setFilter(chip.key);
                  setActiveFolderId(null);
                  setShowArchive(false);
                }}
                className={cn(
                  'm3-chip shrink-0',
                  !activeFolder && filter === chip.key && 'm3-chip-active',
                )}
              >
                {chip.label}
              </button>
            ))}

            {prefs.folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className={cn('m3-chip shrink-0 gap-1.5', activeFolderId === folder.id && 'm3-chip-active')}
              >
                <Folder className="h-3.5 w-3.5" />
                {folder.name}
                <span className="text-[10px] opacity-70">{folder.chatIds.length}</span>
              </button>
            ))}

            {prefs.archivedChatIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowArchive((value) => !value);
                  setActiveFolderId(null);
                  setFilter('all');
                }}
                className={cn('m3-chip shrink-0 gap-1.5', showArchive && 'm3-chip-active')}
              >
                <Archive className="h-3.5 w-3.5" />
                Архив
                <span className="text-[10px] opacity-70">{prefs.archivedChatIds.length}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openFolderDialog()}
              className="m3-chip shrink-0 gap-1 text-primary"
              aria-label="Создать папку с чатами"
            >
              <FolderPlus className="h-3.5 w-3.5" /> Папка
            </button>
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
              ) : visibleChats.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-outline-variant px-6 py-12 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-on-surface-variant">
                    {showArchive ? 'Архив пуст' : activeFolder ? 'В папке пока нет чатов' : t.emptyChats}
                  </p>
                </div>
              ) : (
                visibleChats.map((chat: any, index: number) => (
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

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="flex max-h-[85vh] w-[95vw] flex-col overflow-hidden rounded-[28px] border-none bg-surface-low p-0 shadow-m3-strong sm:max-w-md">
          <DialogHeader className="space-y-1 border-b border-outline-variant/60 px-6 pb-4 pt-6 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <FolderPlus className="h-5 w-5 text-primary" /> Папки с чатами
            </DialogTitle>
            <DialogDescription className="text-xs text-on-surface-variant">
              Сгруппируйте диалоги и переключайтесь одним тапом.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            {prefs.folders.length > 0 && (
              <div className="space-y-2">
                <p className="m3-label px-1">Мои папки</p>
                {prefs.folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-2 rounded-2xl bg-surface-high/70 px-3 py-2"
                  >
                    <Folder className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-on-surface">{folder.name}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {folder.chatIds.length} чатов
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => openFolderDialog(folder)}
                      aria-label="Изменить папку"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-destructive"
                      onClick={() => deleteFolder(folder.id)}
                      aria-label="Удалить папку"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="m3-label ml-1">
                {editingFolderId ? 'Название папки' : 'Новая папка'}
              </Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Например, Работа"
                className="m3-field"
              />
            </div>

            <div className="space-y-2">
              <p className="m3-label px-1">Чаты в папке</p>
              {sortedChats.length === 0 ? (
                <p className="text-xs text-on-surface-variant">Пока нет чатов для группировки.</p>
              ) : (
                <ul className="space-y-1">
                  {sortedChats.map((chat: any) => {
                    const selected = folderChatIds.includes(chat.id);
                    const otherId =
                      chat.type === 'individual'
                        ? chat.participants?.find((id: string) => id !== user?.uid)
                        : null;
                    const chatTitle =
                      chat.type === 'individual'
                        ? chat.metadata?.[otherId || '']?.displayName || 'Личный чат'
                        : chat.name || 'Группа';
                    return (
                      <li key={chat.id}>
                        <button
                          type="button"
                          onClick={() => toggleFolderChat(chat.id)}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors',
                            selected ? 'bg-primary-container/60' : 'hover:bg-on-surface/5',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                              selected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-outline-variant',
                            )}
                          >
                            {selected && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="truncate text-xs font-semibold text-on-surface">
                            {chatTitle}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-outline-variant/60 p-4">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full"
              onClick={() => setFolderDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              className="h-11 flex-1 rounded-full bg-primary font-bold text-primary-foreground"
              onClick={saveFolder}
            >
              {editingFolderId ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
