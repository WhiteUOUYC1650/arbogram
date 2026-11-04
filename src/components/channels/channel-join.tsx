"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BellPlus, Hash, Loader2, Lock, MessageSquare, Users } from 'lucide-react';
import { arrayUnion, collection, doc, getDoc, getDocs, limit, query, where, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { SlinkLogo } from '@/components/slink-logo';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME } from '@/lib/brand';
import { sendSystemNotification } from '@/lib/system-notifications';

/** Чат, который нужно открыть после входа по ссылке. */
export const PENDING_CHAT_KEY = 'slink:open-chat';

export function openChatById(router: ReturnType<typeof useRouter>, chatId: string) {
  try {
    sessionStorage.setItem(PENDING_CHAT_KEY, chatId);
  } catch {
    // приватный режим
  }
  router.replace('/');
}

/** Страница канала по внутренней ссылке: описание, подписка, переход в чат. */
export function ChannelJoin({ slug }: { slug: string }) {
  const db = useFirestore();
  const router = useRouter();
  const { user, loading } = useUser();
  const { toast } = useToast();

  const [state, setState] = React.useState<'loading' | 'ready' | 'notfound'>('loading');
  const [chat, setChat] = React.useState<any>(null);
  const [isJoining, setIsJoining] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  React.useEffect(() => {
    if (!db || !user || !slug) return;

    let cancelled = false;

    (async () => {
      const normalized = slug.toLowerCase();

      try {
        // 1) Новые каналы создаются с id `channel_<slug>` — читаем напрямую, без индексов
        const directSnap = await getDoc(doc(db, 'chats', `channel_${normalized}`));
        if (!cancelled && directSnap.exists()) {
          setChat({ id: directSnap.id, ...directSnap.data() });
          setState('ready');
          return;
        }
      } catch {
        // нет доступа/документа — пробуем поиск ниже
      }

      try {
        // 2) Старые каналы: поиск по слагу среди публичных
        const snap = await getDocs(
          query(
            collection(db, 'chats'),
            where('isPublic', '==', true),
            where('slug', '==', normalized),
            limit(1),
          ),
        );

        if (cancelled) return;

        if (!snap.empty) {
          setChat({ id: snap.docs[0].id, ...snap.docs[0].data() });
          setState('ready');
        } else {
          setState('notfound');
        }
      } catch (error) {
        console.warn('[SLink] Не удалось найти канал по ссылке:', error);
        if (!cancelled) setState('notfound');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, user, slug]);

  const isMember = Boolean(user && chat?.participants?.includes(user.uid));

  const handleOpen = () => {
    if (chat) openChatById(router, chat.id);
  };

  const handleSubscribe = async () => {
    if (!db || !user || !chat) return;
    setIsJoining(true);
    try {
      await updateDoc(doc(db, 'chats', chat.id), { participants: arrayUnion(user.uid) });
      await sendSystemNotification(
        db,
        chat.id,
        `${user.displayName || 'Новый подписчик'} подписался на канал`,
        'joined',
      );
      toast({ title: 'Вы подписались', description: chat.name });
      openChatById(router, chat.id);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Не удалось подписаться', description: error.message });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          <SlinkLogo className="h-7 w-7" /> {APP_NAME}
        </div>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 rounded-[28px] border border-outline-variant/60 bg-surface-low p-10 shadow-m3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-on-surface-variant">Ищем канал…</p>
          </div>
        )}

        {state === 'notfound' && (
          <div className="flex flex-col items-center gap-4 rounded-[28px] border border-outline-variant/60 bg-surface-low p-8 text-center shadow-m3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
              <Hash className="h-7 w-7" />
            </span>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-on-surface">Канал не найден</h1>
              <p className="text-sm text-on-surface-variant">
                Ссылка устарела или канал закрыли. Попросите новую у владельца.
              </p>
            </div>
            <Button className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground" onClick={() => router.replace('/')}>
              На главную
            </Button>
          </div>
        )}

        {state === 'ready' && chat && (
          <div className="overflow-hidden rounded-[28px] border border-outline-variant/60 bg-surface-low shadow-m3">
            <div className="relative h-28 overflow-hidden bg-primary-container">
              <div aria-hidden className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/25 blur-2xl" />
            </div>

            <div className="flex flex-col items-center px-6 pb-6 -mt-12">
              <span className="flex h-24 w-24 items-center justify-center rounded-[28px] border-4 border-surface-low bg-secondary-container text-secondary-on-container shadow-m3">
                <Hash className="h-9 w-9" />
              </span>

              <h1 className="mt-3 text-center text-xl font-extrabold tracking-tight text-on-surface">
                {chat.name || 'Канал'}
              </h1>
              <p className="mt-1 font-mono text-xs text-primary">slink/{chat.slug || slug}</p>

              {chat.description ? (
                <p className="mt-3 text-center text-sm leading-relaxed text-on-surface-variant">
                  {chat.description}
                </p>
              ) : null}

              <div className="mt-4 flex items-center gap-3 text-[11px] font-semibold text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {chat.participants?.length || 0} подписчиков
                </span>
                <span className="flex items-center gap-1.5">
                  {chat.isPublic ? <MessageSquare className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {chat.isPublic ? 'Публичный' : 'Приватный'}
                </span>
              </div>

              <Button
                className="mt-6 h-12 w-full gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-m3"
                onClick={isMember ? handleOpen : handleSubscribe}
                disabled={isJoining}
              >
                {isJoining ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isMember ? (
                  <><MessageSquare className="h-4 w-4" /> Открыть канал</>
                ) : (
                  <><BellPlus className="h-4 w-4" /> Подписаться</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
