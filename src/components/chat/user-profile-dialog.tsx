"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserAvatar } from '@/components/user-avatar';
import { Calendar, Cake, Mail, MessageSquare, Pause, Phone, Play } from 'lucide-react';
import { translations, Language } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatBirthDate, formatLastSeen, getBannerClass, type ProfileMusic } from '@/lib/profile-extras';

interface UserProfileDialogProps {
  userId: string;
  children: React.ReactNode;
  onStartChat?: (userId: string) => void;
}

export function UserProfileDialog({ userId, children, onStartChat }: UserProfileDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const db = useFirestore();

  React.useEffect(() => {
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];

  const userRef = useMemoFirebase(() => (db && userId ? doc(db, 'users', userId) : null), [db, userId]);
  const { data: userData } = useDoc(userRef);

  React.useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [open]);

  if (!userId || userId === 'p7gSC3o9OxVezsjDbrFq') return <>{children}</>;

  const isOnline = userData?.status === 'online';
  const lastSeenVisibility = userData?.prefs?.privacy?.lastSeen ?? 'everyone';
  const canSeeLastSeen = lastSeenVisibility === 'everyone';
  const music: ProfileMusic | undefined = userData?.music?.url ? userData.music : undefined;
  const birthDate = formatBirthDate(userData?.birthDate);
  const bannerUrl: string | undefined = userData?.banner;
  const bannerClass = getBannerClass(userData?.bannerPreset);
  const email: string | undefined = userData?.email;
  const showEmail = Boolean(email && !email.endsWith('@covechat.local'));

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[95vw] overflow-y-auto rounded-[28px] border-none bg-surface-container p-0 shadow-m3-strong sm:max-w-md">
        <DialogTitle className="sr-only">{t.profile}</DialogTitle>

        {/* Баннер */}
        <div className={cn('relative h-36 w-full overflow-hidden', bannerUrl ? 'bg-surface-high' : bannerClass)}>
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          )}
        </div>

        <div className="-mt-16 flex flex-col items-center px-6 pb-7">
          <div className="relative">
            <UserAvatar
              userId={userId}
              fallback={userData?.displayName}
              className="h-32 w-32 rounded-full border-4 border-surface-container shadow-m3"
            />
            {isOnline && (
              <span className="absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-surface-container bg-success" />
            )}
          </div>

          <div className="mt-4 space-y-1 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">
              {userData?.displayName || 'Пользователь'}
            </h2>
            {userData?.username ? (
              <p className="font-mono text-sm text-primary">{userData.username}</p>
            ) : null}

            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                isOnline ? 'bg-success/15 text-success' : 'bg-surface-high text-on-surface-variant',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-success' : 'bg-outline')} />
              {isOnline
                ? t.online
                : canSeeLastSeen
                  ? `был(а) в сети ${formatLastSeen(userData?.lastSeen)}`
                  : t.offline}
            </span>
          </div>

          {/* Музыка профиля */}
          {music ? (
            <button
              type="button"
              onClick={toggleMusic}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl bg-primary-container/70 p-3 text-left transition-colors hover:bg-primary-container"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-primary-on-container">
                  {music.title}
                </span>
                <span className="block truncate text-[11px] text-primary-on-container/70">
                  {music.artist || 'Музыка профиля'}
                </span>
              </span>
              <audio
                ref={audioRef}
                src={music.url}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
              />
            </button>
          ) : null}

          <div className="mt-5 w-full space-y-2">
            {userData?.phoneNumber ? (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-primary-on-container">
                  <Phone className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m3-label">{t.phone}</p>
                  <p className="truncate text-sm font-medium text-on-surface">{userData.phoneNumber}</p>
                </div>
              </div>
            ) : null}

            {showEmail ? (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-secondary-on-container">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m3-label">{t.email}</p>
                  <p className="truncate text-sm font-medium text-on-surface">{email}</p>
                </div>
              </div>
            ) : null}

            {birthDate ? (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container text-tertiary-on-container">
                  <Cake className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m3-label">Дата рождения</p>
                  <p className="truncate text-sm font-medium text-on-surface">{birthDate}</p>
                </div>
              </div>
            ) : null}

            {userData?.lastSeen && canSeeLastSeen && !isOnline ? (
              <div className="flex items-center gap-4 rounded-2xl bg-surface-high/70 p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-surface-variant">
                  <Calendar className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m3-label">Последний визит</p>
                  <p className="truncate text-sm font-medium text-on-surface">
                    {new Date(userData.lastSeen).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex w-full gap-3">
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
