"use client";

import * as React from 'react';
import {
  Search,
  Send,
  Loader2,
  Users,
  Globe,
  Plus,
  X,
  Hash,
  UserPlus,
  Smile,
  Check,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  limit,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/user-avatar';
import { cn } from '@/lib/utils';
import { sendSystemNotification } from '@/lib/system-notifications';
import { notifyServiceBot } from '@/lib/service-bot';

const CHUNK_SIZE = 800000; // ~800KB

type CreateTab = 'direct' | 'group' | 'channel' | 'stickers';

interface CreateChatDialogProps {
  children: React.ReactNode;
  onChatCreated?: (chatId: string) => void;
}

export function CreateChatDialog({ children, onChatCreated }: CreateChatDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<CreateTab>('direct');

  // Direct
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<any>(null);

  // Group
  const [groupName, setGroupName] = React.useState('');
  const [groupMembers, setGroupMembers] = React.useState('');

  // Channel
  const [channelName, setChannelName] = React.useState('');
  const [channelDescription, setChannelDescription] = React.useState('');
  const [channelSlug, setChannelSlug] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);

  // Sticker pack
  const [packName, setPackName] = React.useState('');
  const [stickerFiles, setStickerFiles] = React.useState<string[]>([]);

  const [isCreating, setIsCreating] = React.useState(false);

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const resetAndClose = (chatId?: string) => {
    setOpen(false);
    setSearchQuery('');
    setFoundUser(null);
    setGroupName('');
    setGroupMembers('');
    setChannelName('');
    setChannelSlug('');
    setChannelDescription('');
    setPackName('');
    setStickerFiles([]);
    if (chatId) onChatCreated?.(chatId);
  };

  const handleSearch = async () => {
    const value = searchQuery.startsWith('@') ? searchQuery : `@${searchQuery.replace(/@/g, '')}`;
    if (!db || value.length < 3) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      const q = query(collection(db, 'users'), where('username', '==', value.toLowerCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const u = snapshot.docs[0].data();
        if (u.uid === user?.uid) {
          toast({ title: 'Это вы 🙂' });
        } else {
          setFoundUser({ ...u, id: snapshot.docs[0].id });
        }
      } else {
        toast({ variant: 'destructive', title: 'Не найдено', description: 'Проверьте @юзернейм.' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const startDirectChat = async () => {
    if (!db || !user || !foundUser) return;
    setIsCreating(true);
    try {
      const participants = [user.uid, foundUser.uid].sort();

      // Поиск существующего диалога не должен ломать создание: если Firestore
      // отклонит запрос (индекс/правила) — просто создаём новый чат.
      try {
        const existing = await getDocs(
          query(
            collection(db, 'chats'),
            where('type', '==', 'individual'),
            where('participants', '==', participants),
            limit(1),
          ),
        );

        if (!existing.empty) {
          resetAndClose(existing.docs[0].id);
          return;
        }
      } catch (lookupError) {
        console.warn('[SLink] Не удалось проверить существующий диалог:', lookupError);
      }

      const meSnap = await getDoc(doc(db, 'users', user.uid));
      const me = meSnap.data();

      const newChat = await addDoc(collection(db, 'chats'), {
        participants,
        type: 'individual',
        ownerId: user.uid,
        metadata: {
          [user.uid]: { displayName: me?.displayName || 'User', photoURL: me?.photoURL || '' },
          [foundUser.uid]: {
            displayName: foundUser.displayName,
            photoURL: foundUser.photoURL || '',
          },
        },
        lastMessage: 'Чат начат',
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp(),
      });

      await sendSystemNotification(
        db,
        newChat.id,
        'Диалог создан — напишите первое сообщение',
        'created',
      );

      resetAndClose(newChat.id);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const resolveMembers = async (raw: string) => {
    if (!db) return [] as string[];
    const handles = raw
      .split(/[,\s]+/)
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean)
      .map((h) => (h.startsWith('@') ? h : `@${h}`));

    const ids: string[] = [];
    for (const handle of Array.from(new Set(handles))) {
      const snap = await getDocs(query(collection(db, 'users'), where('username', '==', handle), limit(1)));
      if (!snap.empty) {
        const uid = snap.docs[0].data().uid;
        if (uid && uid !== user?.uid) ids.push(uid);
      }
    }
    return ids;
  };

  const createGroup = async () => {
    if (!db || !user || !groupName.trim()) return;
    setIsCreating(true);
    try {
      const memberIds = await resolveMembers(groupMembers);
      const newChat = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, ...memberIds],
        type: 'group',
        name: groupName.trim(),
        ownerId: user.uid,
        lastMessage: 'Группа создана',
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp(),
      });

      await sendSystemNotification(db, newChat.id, `Группа «${groupName.trim()}» создана`, 'created');
      await sendSystemNotification(
        db,
        newChat.id,
        `Участников в группе: ${memberIds.length + 1}`,
        'info',
      );

      await notifyServiceBot(
        db,
        user,
        user.displayName,
        `Вы создали группу «${groupName.trim()}» — участников: ${memberIds.length + 1}`,
      );

      toast({ title: 'Группа создана', description: `Участников: ${memberIds.length + 1}` });
      resetAndClose(newChat.id);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  // Транслитерация, чтобы ссылки были стабильными и без кириллицы
  const TRANSLIT: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .split('')
      .map((char) => TRANSLIT[char] ?? char)
      .join('')
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);

  const createChannel = async () => {
    if (!db || !user || !channelName.trim()) return;
    setIsCreating(true);
    try {
      const baseSlug =
        slugify(channelSlug || channelName) || `channel-${Date.now().toString(36).slice(-6)}`;

      // id документа = channel_<slug>: уникальность через id, без составных индексов
      let finalSlug = baseSlug;
      let chatRef = doc(db, 'chats', `channel_${finalSlug}`);
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const existing = await getDoc(chatRef).catch(() => null);
        if (!existing || !existing.exists()) break;
        finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        chatRef = doc(db, 'chats', `channel_${finalSlug}`);
      }

      await setDoc(chatRef, {
        participants: [user.uid],
        type: 'channel',
        name: channelName.trim(),
        description: channelDescription.trim(),
        slug: finalSlug,
        isPublic,
        ownerId: user.uid,
        lastMessage: 'Канал создан',
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp(),
      });

      await sendSystemNotification(
        db,
        chatRef.id,
        `Канал «${channelName.trim()}» создан · slink/${finalSlug}`,
        'channel',
      );

      await notifyServiceBot(
        db,
        user,
        user.displayName,
        `Вы создали канал «${channelName.trim()}» — slink/${finalSlug}`,
      );

      toast({ title: 'Канал создан', description: `slink/${finalSlug}` });
      resetAndClose(chatRef.id);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Не удалось создать канал', description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStickerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Слишком большой файл', description: 'Макс 10 МБ' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setStickerFiles((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const createStickerPack = async () => {
    if (!db || !user || !packName.trim() || stickerFiles.length === 0) return;
    setIsCreating(true);
    try {
      const packRef = await addDoc(collection(db, 'stickerPacks'), {
        name: packName,
        ownerId: user.uid,
        createdAt: Date.now(),
      });

      for (const fileData of stickerFiles) {
        const isGif = fileData.startsWith('data:image/gif');
        const stickerRef = await addDoc(collection(db, 'stickerPacks', packRef.id, 'stickers'), {
          type: isGif ? 'gif' : 'sticker',
          packId: packRef.id,
          chunkCount: Math.ceil(fileData.length / CHUNK_SIZE),
        });

        const chunks: string[] = [];
        for (let i = 0; i < fileData.length; i += CHUNK_SIZE) {
          chunks.push(fileData.substring(i, i + CHUNK_SIZE));
        }

        for (let i = 0; i < chunks.length; i++) {
          await addDoc(collection(db, 'stickerPacks', packRef.id, 'stickers', stickerRef.id, 'chunks'), {
            data: chunks[i],
            index: i,
          });
        }
      }

      toast({ title: 'Стикерпак создан!' });
      resetAndClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const tabs: { key: CreateTab; label: string; icon: typeof Send }[] = [
    { key: 'direct', label: 'Личный', icon: Send },
    { key: 'group', label: 'Группа', icon: Users },
    { key: 'channel', label: 'Канал', icon: Hash },
    { key: 'stickers', label: 'Стикеры', icon: Smile },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-[70vh] max-h-[600px] min-h-[440px] w-[95vw] flex-col overflow-hidden rounded-[28px] border-none bg-surface-low p-0 shadow-m3-strong sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-outline-variant/60 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Plus className="h-5 w-5 text-primary" /> Новое
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant">
            Личный диалог, группа, канал или набор стикеров.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-4">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-surface-high p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  'flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-all',
                  tab === key
                    ? 'bg-surface-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === 'direct' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex gap-2">
                <Input
                  placeholder="@username"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="m3-field font-mono"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || searchQuery.length < 3}
                  className="h-14 w-14 shrink-0 rounded-2xl bg-secondary p-0 text-secondary-foreground"
                  aria-label="Найти"
                >
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </Button>
              </div>

              {foundUser ? (
                <div className="flex items-center gap-3 rounded-3xl border border-primary/25 bg-primary-container/60 p-3">
                  <UserAvatar userId={foundUser.uid} fallback={foundUser.displayName} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{foundUser.displayName}</p>
                    <p className="truncate font-mono text-xs text-primary">{foundUser.username}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={startDirectChat}
                    disabled={isCreating}
                    className="h-10 gap-3 rounded-full bg-primary px-4 text-primary-foreground"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Написать
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-outline-variant px-6 py-10 text-center">
                  <UserPlus className="h-7 w-7 text-on-surface-variant" />
                  <p className="text-xs text-on-surface-variant">
                    Найдите человека по @юзернейму, чтобы начать диалог.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'group' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Название группы</Label>
                <Input
                  placeholder="Например, Проект SLink"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="m3-field"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Участники (через запятую)</Label>
                <Input
                  placeholder="@alice, @bob"
                  value={groupMembers}
                  onChange={(e) => setGroupMembers(e.target.value)}
                  className="m3-field font-mono text-sm"
                />
                <p className="px-1 text-[11px] text-on-surface-variant">
                  Вы добавитесь автоматически. Неизвестные юзернеймы будут пропущены.
                </p>
              </div>
              <Button
                className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-m3"
                onClick={createGroup}
                disabled={isCreating || !groupName.trim()}
              >
                {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Создать группу'}
              </Button>
            </div>
          )}

          {tab === 'channel' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Название канала</Label>
                <Input
                  placeholder="Например, SLink News"
                  value={channelName}
                  onChange={(e) => {
                    setChannelName(e.target.value);
                    if (!channelSlug) setChannelSlug(slugify(e.target.value));
                  }}
                  className="m3-field"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Слаг</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xs text-on-surface-variant">
                    slink/
                  </span>
                  <Input
                    placeholder="slink-news"
                    value={channelSlug}
                    onChange={(e) => setChannelSlug(slugify(e.target.value))}
                    className="m3-field pl-16 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Описание (необязательно)</Label>
                <Input
                  placeholder="О чём канал? Видно по ссылке"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  className="m3-field"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface-high/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-secondary-on-container">
                    <Globe className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Публичный канал</p>
                    <p className="text-[11px] text-on-surface-variant">Открывается по ссылке /join/?slug=…</p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <Button
                className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-m3"
                onClick={createChannel}
                disabled={isCreating || !channelName.trim()}
              >
                {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Создать канал'}
              </Button>
            </div>
          )}

          {tab === 'stickers' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Название пака</Label>
                <Input
                  placeholder="Например, Крутые коты"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  className="m3-field"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Стикеры или GIF (до 10 МБ)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {stickerFiles.map((s, i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-2xl border border-outline-variant/60"
                    >
                      <img src={s} className="h-full w-full object-cover" alt="Стикер" />
                      <button
                        onClick={() => setStickerFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        aria-label="Удалить"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant transition-colors hover:bg-on-surface/5">
                    <Plus className="h-6 w-6 text-on-surface-variant" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleStickerFile} multiple />
                  </label>
                </div>
              </div>
              <Button
                className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-m3"
                onClick={createStickerPack}
                disabled={isCreating || !packName || stickerFiles.length === 0}
              >
                {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-4 w-4" /> Опубликовать пак</>}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
