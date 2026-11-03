"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { MessageSquare, Phone, Mail, Calendar } from 'lucide-react';
import { translations, Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface UserProfileDialogProps {
  userId: string;
  children: React.ReactNode;
  onStartChat?: (userId: string) => void;
}

export function UserProfileDialog({ userId, children, onStartChat }: UserProfileDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const db = useFirestore();

  React.useEffect(() => {
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  const userRef = useMemoFirebase(() => (db && userId ? doc(db, 'users', userId) : null), [db, userId]);
  const { data: userData } = useDoc(userRef);

  if (!userId || userId === 'p7gSC3o9OxVezsjDbrFq') return <>{children}</>;

  const isOnline = userData?.status === 'online';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] overflow-hidden rounded-[28px] border-none bg-surface-container p-0 shadow-m3-strong sm:max-w-md">
        <DialogTitle className="sr-only">{t.profile}</DialogTitle>

        <div className="relative h-36 overflow-hidden bg-primary-container">
          <div
            aria-hidden
            className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-2xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-20 left-4 h-40 w-40 rounded-full bg-secondary/25 blur-2xl"
          />
        </div>

        <div className="flex flex-col items-center px-6 pb-7 -mt-16">
          <div className="relative">
            <UserAvatar
              userId={userId}
              fallback={userData?.displayName}
              className="h-32 w-32 rounded-[28px] border-4 border-surface-container shadow-m3"
            />
            {isOnline && (
              <span className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-surface-container bg-success" />
            )}
          </div>

          <div className="mt-4 space-y-1 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              {userData?.displayName || '…'}
            </h2>
            <p className="font-mono text-sm text-primary">{userData?.username || '@…'}</p>
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                isOnline
                  ? 'bg-success/15 text-success'
                  : 'bg-surface-high text-on-surface-variant',
              )}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-success' : 'bg-outline')}
              />
              {isOnline ? t.online : t.offline}
            </span>
          </div>

          <div className="mt-7 w-full space-y-2">
            <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-primary-on-container">
                <Phone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m3-label">{t.phone}</p>
                <p className="truncate text-sm font-medium text-on-surface">
                  {userData?.phoneNumber || 'Не указан'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-secondary-on-container">
                <Mail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m3-label">{t.email}</p>
                <p className="truncate text-sm font-medium text-on-surface">
                  {userData?.email || 'Скрыт'}
                </p>
              </div>
            </div>

            {userData?.lastSeen && (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-container text-tertiary-on-container">
                  <Calendar className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m3-label">Последний визит</p>
                  <p className="truncate text-sm font-medium text-on-surface">
                    {new Date(userData.lastSeen).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-7 flex w-full gap-3">
            <Button
              className="h-12 flex-1 gap-2 rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-m3 transition-transform active:scale-[0.98]"
              onClick={() => {
                onStartChat?.(userId);
                setOpen(false);
              }}
            >
              <MessageSquare className="h-5 w-5" />
              Написать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
