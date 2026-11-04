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
  HardDrive,
  Trash2,
  Download,
  RotateCcw,
  Info,
  Sparkles,
  List,
  Image as ImageIcon,
  CornerDownLeft,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Plus,
  Copy,
  Eye,
  LogIn,
  CheckCheck,
  Cake,
  Music,
  Bell,
  Lock as LockIcon,
  Play,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { translations, Language } from '@/lib/i18n';
import { normalizePhoneNumber } from '@/lib/phone-utils';
import { APP_NAME, APP_VERSION_LABEL } from '@/lib/brand';
import { notifyServiceBot } from '@/lib/service-bot';
import { getAppSettings, resetAppSettings, updateAppSettings, useAppSettings } from '@/lib/app-settings';
import { clearAppCache, formatBytes, getCacheStats, type CacheStats } from '@/lib/cache';
import { BANNER_PRESETS, MUSIC_PRESETS, getBannerClass } from '@/lib/profile-extras';
import { ACCENT_PALETTES, applyGlobalPalette } from '@/lib/palettes';
import {
  getDeviceId,
  useUserPrefs,
  type AccessKey,
  type DeviceSession,
  type Visibility,
} from '@/lib/user-prefs';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'appearance' | 'privacy' | 'data' | 'language';

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

function generateAccessKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () => {
    const bytes = new Uint8Array(4);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 4; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes)
      .map((byte) => alphabet[byte % alphabet.length])
      .join('');
  };
  return `SL-${block()}-${block()}-${block()}`;
}

function VisibilityPicker({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  const options: { id: Visibility; label: string }[] = [
    { id: 'everyone', label: 'Все' },
    { id: 'contacts', label: 'Контакты' },
    { id: 'nobody', label: 'Никто' },
  ];

  return (
    <div className="flex shrink-0 gap-1 rounded-full bg-surface-lowest p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'h-8 rounded-full px-2.5 text-[11px] font-semibold transition-colors',
            value === option.id
              ? 'bg-primary text-primary-foreground'
              : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface-high/70 p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary-on-container">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface">{title}</p>
          {description ? (
            <p className="text-[11px] leading-snug text-on-surface-variant">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Баннер профиля: 1200×400 JPEG, чтобы уложиться в лимит документа Firestore. */
function compressBanner(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const WIDTH = 1200;
        const HEIGHT = 400;
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx?.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
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
  const [stats, setStats] = React.useState<CacheStats | null>(null);
  const [isClearing, setIsClearing] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [lastCleared, setLastCleared] = React.useState<number | null>(null);
  const [birthDate, setBirthDate] = React.useState('');
  const [bannerPreset, setBannerPreset] = React.useState('violet');
  const [bannerBase64, setBannerBase64] = React.useState('');
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false);
  const [musicTitle, setMusicTitle] = React.useState('');
  const [musicUrl, setMusicUrl] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const settings = useAppSettings();
  const { prefs, setPalette, setPrivacy, setSessions, setAccessKeys } = useUserPrefs();

  const db = useFirestore();
  const auth = useAuth();
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
      setBirthDate(userData.birthDate || '');
      setBannerPreset(userData.bannerPreset || 'violet');
      setBannerBase64(userData.banner || '');
      setMusicTitle(userData.music?.title || '');
      setMusicUrl(userData.music?.url || '');
    }
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, [userData]);

  const refreshStats = React.useCallback(async () => {
    setStats(await getCacheStats());
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem('slink:lastCacheClear');
    setLastCleared(stored ? Number(stored) : null);
    if (tab === 'data') refreshStats();
  }, [open, tab, refreshStats]);

  const t = translations[lang];

  const handleUpdateProfile = async () => {
    if (!db || !user) return;
    setIsUpdating(true);
    try {
      const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : '';

      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        phoneNumber: normalizedPhone,
        birthDate: birthDate || null,
        bannerPreset,
        banner: bannerBase64 || null,
        music: musicUrl
          ? {
              title: musicTitle.trim() || 'Моя музыка',
              artist: MUSIC_PRESETS.find((track) => track.url === musicUrl)?.artist || 'SLink',
              url: musicUrl,
            }
          : null,
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

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const base64 = await compressBanner(file);
      setBannerBase64(base64);
      toast({ title: 'Баннер готов', description: 'Нажмите «Сохранить», чтобы применить' });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось загрузить баннер' });
    } finally {
      setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (!auth?.currentUser || !user?.email) return;

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Пароль слишком короткий', description: 'Минимум 6 символов' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      toast({ title: 'Пароль изменён' });
    } catch (error: any) {
      let message = error?.message || 'Попробуйте ещё раз';
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
        message = 'Текущий пароль неверен';
      }
      if (error?.code === 'auth/weak-password') message = 'Слишком простой пароль';
      toast({ variant: 'destructive', title: 'Не удалось изменить пароль', description: message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (!value) {
      updateAppSettings({ notifications: false });
      return;
    }

    if (typeof Notification === 'undefined') {
      toast({ variant: 'destructive', title: 'Браузер не поддерживает уведомления' });
      return;
    }

    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;

    if (permission !== 'granted') {
      toast({
        variant: 'destructive',
        title: 'Разрешение не выдано',
        description: 'Включите уведомления для SLink в настройках браузера',
      });
      return;
    }

    updateAppSettings({ notifications: true });
    new Notification('SLink', { body: 'Уведомления включены' });
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

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const { freedBytes } = await clearAppCache();
      setLastCleared(Date.now());
      await refreshStats();
      toast({
        title: 'Кэш очищен',
        description: freedBytes
          ? `Освобождено ${formatBytes(freedBytes)}. Настройки и вход сохранены.`
          : 'Настройки, тема и вход сохранены.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось очистить кэш' });
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
    }
  };

  const handleResetSettings = () => {
    resetAppSettings();
    toast({ title: 'Настройки сброшены', description: 'Тема и язык не изменились.' });
  };

  const handleExportProfile = () => {
    if (!user) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        uid: user.uid,
        displayName: userData?.displayName ?? user.displayName,
        username: userData?.username ?? null,
        email: userData?.email ?? user.email,
        phoneNumber: userData?.phoneNumber ?? null,
      },
      settings: getAppSettings(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slink-profile-${(userData?.username || 'me').replace('@', '')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Экспорт готов', description: 'JSON-файл профиля скачан' });
  };

  const handleCreateAccessKey = async () => {
    const key: AccessKey = {
      id: `key_${Date.now().toString(36)}`,
      value: generateAccessKey(),
      createdAt: Date.now(),
    };

    try {
      await setAccessKeys([...prefs.accessKeys, key]);
      try {
        await navigator.clipboard.writeText(key.value);
      } catch {
        // буфер обмена может быть недоступен
      }
      toast({ title: 'Ключ создан', description: 'Скопирован в буфер обмена' });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось создать ключ' });
    }
  };

  const handleCopyAccessKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Ключ скопирован' });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось скопировать' });
    }
  };

  const handleRevokeAccessKey = async (id: string) => {
    try {
      await setAccessKeys(prefs.accessKeys.filter((key) => key.id !== id));
      toast({ title: 'Ключ отозван' });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось отозвать ключ' });
    }
  };

  const tabs: { key: SettingsTab; label: string; icon: typeof UserIcon }[] = [
    { key: 'profile', label: t.profile, icon: UserIcon },
    { key: 'appearance', label: 'Тема', icon: Palette },
    { key: 'privacy', label: 'Приват.', icon: ShieldCheck },
    { key: 'data', label: 'Данные', icon: HardDrive },
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
          <div className="grid grid-cols-5 gap-0.5 rounded-full bg-surface-high p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                title={label}
                aria-label={label}
                className={cn(
                  'flex h-10 min-w-0 items-center justify-center gap-1 rounded-full px-1 text-[10px] font-semibold transition-all',
                  tab === key
                    ? 'bg-surface-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden truncate md:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {tab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24 rounded-full shadow-m3">
                    <AvatarImage src={avatarData?.base64} className="object-cover" />
                    <AvatarFallback className="rounded-full bg-primary-container text-2xl font-bold text-primary-on-container">
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
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
                  {userData?.username}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="m3-label ml-1">Баннер профиля</Label>
                  <div
                    className={cn(
                      'relative h-24 w-full overflow-hidden rounded-2xl',
                      bannerBase64 ? 'bg-surface-high' : getBannerClass(bannerPreset),
                    )}
                  >
                    {bannerBase64 ? (
                      <img src={bannerBase64} alt="Баннер" className="h-full w-full object-cover" />
                    ) : null}
                    <label className="absolute bottom-2 right-2 flex h-8 cursor-pointer items-center gap-1 rounded-full bg-black/45 px-3 text-[10px] font-semibold text-white backdrop-blur">
                      {isUploadingBanner ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      Загрузить
                      <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {BANNER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setBannerPreset(preset.id);
                          setBannerBase64('');
                        }}
                        aria-label={preset.label}
                        className={cn(
                          'h-8 w-8 rounded-full',
                          preset.className,
                          bannerPreset === preset.id && !bannerBase64
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-low'
                            : 'ring-1 ring-outline-variant',
                        )}
                      />
                    ))}
                  </div>
                </div>

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

                <div className="space-y-1.5">
                  <Label className="m3-label ml-1">Дата рождения</Label>
                  <div className="relative">
                    <Cake className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="m3-field pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="m3-label ml-1">Музыка профиля</Label>
                  <div className="space-y-1.5">
                    {MUSIC_PRESETS.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setMusicUrl(track.url);
                          setMusicTitle(track.title);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors',
                          musicUrl === track.url
                            ? 'border-primary bg-primary-container/40'
                            : 'border-outline-variant/60 hover:bg-on-surface/5',
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Play className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-on-surface">
                            {track.title}
                          </span>
                          <span className="block truncate text-[10px] text-on-surface-variant">
                            {track.artist}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Music className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      placeholder="или ссылка на mp3"
                      value={musicUrl}
                      onChange={(e) => setMusicUrl(e.target.value)}
                      className="m3-field pl-12 text-xs"
                    />
                  </div>
                  {musicUrl ? (
                    <Button
                      variant="outline"
                      className="h-9 w-full rounded-full text-[11px]"
                      onClick={() => {
                        setMusicUrl('');
                        setMusicTitle('');
                      }}
                    >
                      Убрать музыку
                    </Button>
                  ) : null}
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
            <div className="space-y-2.5 animate-in fade-in duration-200">
              <SettingRow
                icon={isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                title={t.darkMode}
                description={t.darkModeHint}
              >
                <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
              </SettingRow>

              <SettingRow
                icon={<Sparkles className="h-5 w-5" />}
                title="Анимации"
                description="Плавные переходы, появление сообщений и списков"
              >
                <Switch
                  checked={settings.animations}
                  onCheckedChange={(value) => updateAppSettings({ animations: value })}
                />
              </SettingRow>

              <SettingRow
                icon={<List className="h-5 w-5" />}
                title="Компактный список чатов"
                description="Больше диалогов на экране"
              >
                <Switch
                  checked={settings.compactChats}
                  onCheckedChange={(value) => updateAppSettings({ compactChats: value })}
                />
              </SettingRow>

              <SettingRow
                icon={<ImageIcon className="h-5 w-5" />}
                title="Показывать истории"
                description="Блок историй над списком чатов"
              >
                <Switch
                  checked={settings.showStories}
                  onCheckedChange={(value) => updateAppSettings({ showStories: value })}
                />
              </SettingRow>

              <SettingRow
                icon={<CornerDownLeft className="h-5 w-5" />}
                title="Enter отправляет сообщение"
                description="Shift + Enter — перенос строки"
              >
                <Switch
                  checked={settings.sendOnEnter}
                  onCheckedChange={(value) => updateAppSettings({ sendOnEnter: value })}
                />
              </SettingRow>

              <SettingRow
                icon={<Bell className="h-5 w-5" />}
                title="Уведомления"
                description="Всплывающие уведомления о новых сообщениях"
              >
                <Switch checked={settings.notifications} onCheckedChange={handleNotificationsToggle} />
              </SettingRow>

              <div className="rounded-3xl border border-outline-variant/60 p-4">
                <p className="m3-label mb-3">Расцветка приложения</p>
                <div className="grid grid-cols-2 gap-2">
                  {ACCENT_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        applyGlobalPalette(palette.id);
                        setPalette(palette.id);
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-left transition-all',
                        prefs.palette === palette.id
                          ? 'border-primary bg-primary-container/40'
                          : 'border-outline-variant/60 hover:bg-on-surface/5',
                      )}
                    >
                      <span
                        className="h-6 w-6 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                        style={{ backgroundColor: palette.swatch }}
                      />
                      <span className="truncate text-[11px] font-semibold text-on-surface">
                        {palette.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="space-y-2.5 rounded-3xl border border-outline-variant/60 p-4">
                <p className="m3-label px-1">Кто видит</p>

                <SettingRow
                  icon={<Eye className="h-5 w-5" />}
                  title="Время захода"
                  description="Статус «был(а) недавно»"
                >
                  <VisibilityPicker
                    value={prefs.privacy.lastSeen}
                    onChange={(value) => setPrivacy({ ...prefs.privacy, lastSeen: value })}
                  />
                </SettingRow>

                <SettingRow
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="Фото профиля"
                  description="Кто видит ваш аватар"
                >
                  <VisibilityPicker
                    value={prefs.privacy.profilePhoto}
                    onChange={(value) => setPrivacy({ ...prefs.privacy, profilePhoto: value })}
                  />
                </SettingRow>

                <SettingRow
                  icon={<LogIn className="h-5 w-5" />}
                  title="Кто может писать"
                  description="Личные сообщения"
                >
                  <VisibilityPicker
                    value={prefs.privacy.whoCanMessage}
                    onChange={(value) => setPrivacy({ ...prefs.privacy, whoCanMessage: value })}
                  />
                </SettingRow>

                <SettingRow
                  icon={<CheckCheck className="h-5 w-5" />}
                  title="Отчёты о прочтении"
                  description="Показывать собеседнику, что вы прочитали"
                >
                  <Switch
                    checked={prefs.privacy.readReceipts}
                    onCheckedChange={(value) =>
                      setPrivacy({ ...prefs.privacy, readReceipts: value })
                    }
                  />
                </SettingRow>
              </div>

              <div className="rounded-3xl border border-outline-variant/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="m3-label">Ваш последний визит</p>
                  <span className="text-[11px] text-on-surface-variant">
                    {prefs.privacy.lastSeen === 'everyone'
                      ? 'виден всем'
                      : prefs.privacy.lastSeen === 'contacts'
                        ? 'виден контактам'
                        : 'скрыт'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-on-surface">
                  {userData?.lastSeen
                    ? new Date(userData.lastSeen).toLocaleString('ru-RU')
                    : 'Пока нет данных'}
                </p>
              </div>

              <div className="rounded-3xl border border-outline-variant/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="m3-label">Активные сеансы</p>
                  <span className="rounded-full bg-surface-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                    {prefs.sessions.length}
                  </span>
                </div>

                {prefs.sessions.length === 0 ? (
                  <p className="mt-3 text-[11px] text-on-surface-variant">
                    Данные о устройствах появятся после повторного входа.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {prefs.sessions.map((session: DeviceSession) => {
                      const isCurrent = session.id === getDeviceId();
                      return (
                        <li
                          key={session.id}
                          className="flex items-center gap-3 rounded-2xl bg-surface-high/70 p-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-on-container">
                            <Smartphone className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 truncate text-xs font-bold text-on-surface">
                              {session.device}
                              {isCurrent && (
                                <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
                                  это устройство
                                </span>
                              )}
                            </p>
                            <p className="truncate text-[10px] text-on-surface-variant">
                              {new Date(session.lastActive).toLocaleString('ru-RU')}
                            </p>
                          </div>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive"
                              onClick={() =>
                                setSessions(prefs.sessions.filter((item) => item.id !== session.id))
                              }
                              aria-label="Завершить сеанс"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <p className="mt-2 text-[10px] leading-snug text-on-surface-variant">
                  Список хранится в профиле пользователя; удаление убирает устройство из списка.
                </p>
              </div>

              <div className="space-y-2 rounded-3xl border border-outline-variant/60 p-4">
                <p className="m3-label flex items-center gap-1.5">
                  <LockIcon className="h-3.5 w-3.5" /> Смена пароля
                </p>
                <Input
                  type="password"
                  placeholder="Текущий пароль"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="m3-field"
                />
                <Input
                  type="password"
                  placeholder="Новый пароль (минимум 6 символов)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="m3-field"
                />
                <Button
                  className="h-11 w-full rounded-full bg-primary font-bold text-primary-foreground"
                  onClick={handleChangePassword}
                  disabled={!currentPassword || newPassword.length < 6 || isChangingPassword}
                >
                  {isChangingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Изменить пароль'}
                </Button>
              </div>

              <div className="rounded-3xl border border-outline-variant/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="m3-label">Ключи доступа</p>
                  <Button
                    variant="outline"
                    className="h-8 gap-1 rounded-full px-3 text-[11px] font-semibold"
                    onClick={handleCreateAccessKey}
                  >
                    <Plus className="h-3.5 w-3.5" /> Создать
                  </Button>
                </div>

                {prefs.accessKeys.length === 0 ? (
                  <p className="mt-3 text-[11px] text-on-surface-variant">
                    Ключей пока нет. Создайте резервный ключ для восстановления доступа.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {prefs.accessKeys.map((key: AccessKey) => (
                      <li
                        key={key.id}
                        className="flex items-center gap-2 rounded-2xl bg-surface-high/70 p-3"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tertiary-container text-tertiary-on-container">
                          <KeyRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs font-semibold text-on-surface">
                            {key.value}
                          </p>
                          <p className="text-[10px] text-on-surface-variant">
                            {new Date(key.createdAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => handleCopyAccessKey(key.value)}
                          aria-label="Скопировать ключ"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-destructive"
                          onClick={() => handleRevokeAccessKey(key.id)}
                          aria-label="Отозвать ключ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-2 text-[10px] leading-snug text-on-surface-variant">
                  Ключи нужны для входа в аккаунт, если пароль утерян. Храните их в надёжном месте.
                </p>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="rounded-3xl border border-outline-variant/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-container text-primary-on-container">
                      <HardDrive className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Кэш приложения</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {stats ? `${formatBytes(stats.totalBytes)} · файлов в кэше: ${stats.cacheEntries}` : 'Считаем…'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={refreshStats}
                    aria-label="Обновить размер кэша"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                {stats?.quota ? (
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-highest">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${Math.min(100, ((stats.usage ?? 0) / stats.quota) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      Хранилище браузера: {formatBytes(stats.usage ?? 0)} из {formatBytes(stats.quota)}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-high/70 p-2.5">
                  <Info className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-[11px] leading-snug text-on-surface-variant">
                    Очистка удаляет кэш страниц и временные данные. Настройки, тема, язык и вход
                    сохраняются.
                  </p>
                </div>

                {confirmClear ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="h-11 flex-1 rounded-full"
                      onClick={() => setConfirmClear(false)}
                      disabled={isClearing}
                    >
                      Отмена
                    </Button>
                    <Button
                      className="h-11 flex-1 rounded-full bg-destructive font-bold text-destructive-foreground"
                      onClick={handleClearCache}
                      disabled={isClearing}
                    >
                      {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Очистить'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="mt-3 h-11 w-full gap-2 rounded-full bg-primary font-bold text-primary-foreground"
                    onClick={() => setConfirmClear(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Очистить кэш
                  </Button>
                )}

                {lastCleared ? (
                  <p className="mt-2 text-center text-[10px] text-on-surface-variant">
                    Последняя очистка: {new Date(lastCleared).toLocaleString('ru-RU')}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleExportProfile}
                className="flex w-full items-center justify-between gap-3 rounded-3xl bg-surface-high/70 p-3.5 text-left transition-colors hover:bg-surface-high"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-secondary-on-container">
                    <Download className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-on-surface">Экспорт профиля</span>
                    <span className="block text-[11px] text-on-surface-variant">JSON с данными аккаунта</span>
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={handleResetSettings}
                className="flex w-full items-center justify-between gap-3 rounded-3xl bg-surface-high/70 p-3.5 text-left transition-colors hover:bg-surface-high"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-tertiary-container text-tertiary-on-container">
                    <RotateCcw className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-on-surface">Сбросить настройки</span>
                    <span className="block text-[11px] text-on-surface-variant">
                      Вернуть оформление по умолчанию
                    </span>
                  </span>
                </span>
              </button>
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
                  {lang === option.value && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
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
