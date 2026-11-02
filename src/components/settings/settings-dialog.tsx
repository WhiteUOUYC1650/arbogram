"use client";

import * as React from 'react';
import {
  Loader2,
  Camera,
  Moon,
  Sun,
  User as UserIcon,
  Phone,
  Languages,
  Settings as SettingsIcon,
  Palette,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { translations, Language } from '@/lib/i18n';
import { normalizePhoneNumber } from '@/lib/phone-utils';
import { APP_NAME, APP_VERSION_LABEL } from '@/lib/brand';
import { notifyServiceBot } from '@/lib/service-bot';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'appearance' | 'language';

/** Сжимаем аватарку в квадрат 512×512, чтобы не раздувать Firestore. */
function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const SIZE = 512;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx?.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<SettingsTab>('profile');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = React.useMemo(() => (db && user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData } = useDoc(userRef);

  const avatarRef = useMemoFirebase(
    () => (db && user ? doc(db, 'avatars', user.uid) : null),
    [db, user],
  );
  const { data: avatarData } = useDoc(avatarRef);

  const [displayName, setDisplayName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');

  React.useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
      setPhoneNumber(userData.phoneNumber || '');
    }
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, [userData]);

  const t = translations[lang];

  const handleUpdateProfile = async () => {
    if (!db || !user) return;
    setIsUpdating(true);
    try {
      const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : '';

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        phoneNumber: normalizedPhone,
      });

      await notifyServiceBot(
        db,
        user,
        displayName.trim(),
        `Профиль обновлён: ${displayName.trim()}${normalizedPhone ? `, ${normalizedPhone}` : ''}`,
      );

      toast({ title: t.success, description: 'Профиль обновлён' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: t.error, description: e.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !user) return;
    setIsUploadingAvatar(true);
    try {
      const base64 = await compressAvatar(file);
      await setDoc(doc(db, 'avatars', user.uid), { base64 }, { merge: true });
      await notifyServiceBot(db, user, userData?.displayName, 'Аватар профиля обновлён');
      toast({ title: t.success, description: 'Аватар обновлён' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.error, description: 'Не удалось загрузить фото' });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const toggleTheme = (val: boolean) => {
    setIsDarkMode(val);
    document.documentElement.classList.toggle('dark', val);
    localStorage.setItem('theme', val ? 'dark' : 'light');
  };

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    window.location.reload();
  };

  const tabs: { key: SettingsTab; label: string; icon: typeof UserIcon }[] = [
    { key: 'profile', label: t.profile, icon: UserIcon },
    { key: 'appearance', label: t.appearance, icon: Palette },
    { key: 'language', label: t.language, icon: Languages },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex h-[86vh] w-[95vw] flex-col overflow-hidden rounded-[28px] border-none bg-surface-low p-0 shadow-m3-strong sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-outline-variant/60 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <SettingsIcon className="h-5 w-5 text-primary" />
            {t.settings}
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant">
            {APP_NAME} · {APP_VERSION_LABEL}
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-high p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all',
                  tab === key
                    ? 'bg-surface-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24 rounded-[28px] shadow-m3">
                    <AvatarImage src={avatarData?.base64} className="object-cover" />
                    <AvatarFallback className="rounded-[28px] bg-primary-container text-2xl font-bold text-primary-on-container">
                      {userData?.displayName?.[0] || <UserIcon className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    className={cn(
                      'absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-surface-low bg-secondary text-secondary-foreground shadow-md transition-transform hover:scale-105',
                      isUploadingAvatar && 'pointer-events-none opacity-70',
                    )}
                    aria-label="Загрузить аватар"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  {userData?.username}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="m3-label ml-1">{t.name}</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="m3-field pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="m3-label ml-1">{t.phone}</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="m3-field pl-12"
                    />
                  </div>
                </div>

                <Button
                  className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-m3"
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : t.save}
                </Button>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface-high/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary-on-container">
                    {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{t.darkMode}</p>
                    <p className="text-[11px] text-on-surface-variant">{t.darkModeHint}</p>
                  </div>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
              </div>

              <div className="rounded-3xl border border-outline-variant/60 p-4">
                <p className="m3-label mb-3">Палитра SLink</p>
                <div className="flex gap-2">
                  <span className="h-10 flex-1 rounded-xl bg-primary" />
                  <span className="h-10 flex-1 rounded-xl bg-primary-container" />
                  <span className="h-10 flex-1 rounded-xl bg-secondary" />
                  <span className="h-10 flex-1 rounded-xl bg-secondary-container" />
                  <span className="h-10 flex-1 rounded-xl bg-tertiary-container" />
                </div>
              </div>
            </div>
          )}

          {tab === 'language' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="m3-label px-1">{t.language}</p>
              {[
                { value: 'ru' as Language, label: 'Русский', flag: '🇷🇺' },
                { value: 'en' as Language, label: 'English', flag: '🇺🇸' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeLanguage(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-3xl border p-4 text-left transition-colors',
                    lang === option.value
                      ? 'border-primary/40 bg-primary-container/60'
                      : 'border-outline-variant/60 hover:bg-on-surface/5',
                  )}
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-on-surface">
                    <span className="text-xl">{option.flag}</span> {option.label}
                  </span>
                  {lang === option.value && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-outline-variant/60 px-6 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {APP_NAME} {APP_VERSION_LABEL}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
