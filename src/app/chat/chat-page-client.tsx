"use client";

import * as React from 'react';
import { MessagesSquare, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { useIsMobile } from '@/hooks/use-mobile';
import { SlinkLogo } from '@/components/slink-logo';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { APP_NAME, APP_TAGLINE, APP_VERSION_LABEL } from '@/lib/brand';
import { translations, Language } from '@/lib/i18n';
import { sendSystemNotification } from '@/lib/system-notifications';
import { PENDING_CHAT_KEY } from '@/components/channels/channel-join';

export default function ChatPageClient() {
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [lang, setLang] = React.useState<Language>('ru');
  const isMobile = useIsMobile();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  React.useEffect(() => {
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);

    // Чат, открытый по внутренней ссылке (/join/?slug=… или /agc/<slug>)
    try {
      const pending = sessionStorage.getItem(PENDING_CHAT_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_CHAT_KEY);
        setActiveChatId(pending);
      }
    } catch {
      // приватный режим
    }
  }, []);

  const t = translations[lang];

  const handleStartDirectChat = async (targetUserId: string) => {
    if (!db || !user || targetUserId === user.uid) return;

    try {
      const participants = [user.uid, targetUserId].sort();

      try {
        const q = query(
          collection(db, 'chats'),
          where('type', '==', 'individual'),
          where('participants', '==', participants),
        );

        const snap = await getDocs(q);
        if (!snap.empty) {
          setActiveChatId(snap.docs[0].id);
          return;
        }
      } catch (lookupError) {
        console.warn('[SLink] Не удалось найти существующий диалог:', lookupError);
      }

      const [userSnap, targetSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDoc(doc(db, 'users', targetUserId)),
      ]);

      if (!userSnap.exists() || !targetSnap.exists()) {
        toast({ variant: 'destructive', title: t.error, description: 'Пользователь не найден.' });
        return;
      }

      const userData = userSnap.data();
      const targetData = targetSnap.data();

      const newChat = await addDoc(collection(db, 'chats'), {
        participants,
        type: 'individual',
        metadata: {
          [user.uid]: { displayName: userData.displayName, photoURL: userData.photoURL || '' },
          [targetUserId]: {
            displayName: targetData.displayName,
            photoURL: targetData.photoURL || '',
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

      setActiveChatId(newChat.id);
    } catch (e) {
      console.error('Start chat error:', e);
      toast({ variant: 'destructive', title: t.error, description: 'Не удалось создать чат.' });
    }
  };

  const showSidebar = !isMobile || !activeChatId;
  const showChat = activeChatId || !isMobile;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-surface">
      {showSidebar && (
        <div
          className={cn(
            'w-full md:w-[360px] lg:w-[400px] flex-shrink-0 border-outline-variant/60 bg-surface-low md:border-r',
            'transition-all duration-300',
          )}
        >
          <ChatSidebar
            activeChatId={activeChatId || undefined}
            onChatSelect={(id) => setActiveChatId(id)}
          />
        </div>
      )}

      {showChat && (
        <main className="relative h-full min-w-0 flex-1 overflow-hidden bg-background">
          {activeChatId ? (
            <ChatWindow
              chatId={activeChatId}
              onBack={() => setActiveChatId(null)}
              onStartDirectChat={handleStartDirectChat}
              onOpenChat={(id) => setActiveChatId(id)}
            />
          ) : (
            <div className="relative hidden h-full flex-col items-center justify-center overflow-hidden p-10 text-center md:flex">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-40 right-[-10%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-48 left-[-10%] h-[420px] w-[420px] rounded-full bg-secondary/10 blur-3xl"
              />

              <div className="relative z-10 flex max-w-md flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SlinkLogo className="h-28 w-28 anim-float" />

                <div className="space-y-2">
                  <h1 className="slink-text-gradient text-5xl font-extrabold tracking-tight">
                    {APP_NAME}
                  </h1>
                  <p className="text-sm text-on-surface-variant">{APP_TAGLINE}</p>
                  <span className="m3-chip m3-chip-active mx-auto mt-2 w-fit border-transparent">
                    {APP_VERSION_LABEL}
                  </span>
                </div>

                <div className="grid w-full grid-cols-3 gap-3 pt-4">
                  {[
                    { icon: MessagesSquare, label: 'Чаты' },
                    { icon: Users, label: 'Группы' },
                    { icon: ShieldCheck, label: 'Приватно' },
                  ].map(({ icon: Icon, label }, index) => (
                    <div
                      key={label}
                      style={{ animationDelay: `${120 + index * 70}ms` }}
                      className="anim-fade-up flex flex-col items-center gap-2 rounded-3xl border border-outline-variant/60 bg-surface-low/70 px-3 py-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-primary-on-container">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
                    </div>
                  ))}
                </div>

                <p className="anim-fade-up anim-delay-5 flex items-center gap-2 text-xs text-on-surface-variant/80">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t.selectChatHint}
                </p>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
