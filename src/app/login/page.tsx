"use client";

import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Moon,
  Sun,
  MessagesSquare,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SlinkLogo } from '@/components/slink-logo';
import { translations, Language } from '@/lib/i18n';
import { normalizePhoneNumber } from '@/lib/phone-utils';
import { updateAppSettings, useAppSettings } from '@/lib/app-settings';
import { APP_NAME, APP_TAGLINE, PHONE_EMAIL_DOMAIN } from '@/lib/brand';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register' | 'setup' | 'recovery';

export default function LoginPage() {
  const auth = useAuth();
  const db = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [emailOrUserOrPhone, setEmailOrUserOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('@');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<Language>('ru');
  const [isDark, setIsDark] = useState(false);
  const settings = useAppSettings();

  // Recovery state
  const [recoveryPin, setRecoveryPin] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'input' | 'pin'>('input');
  const [foundUserForRecovery, setFoundUserForRecovery] = useState<any>(null);

  useEffect(() => {
    const storedLang = localStorage.getItem('lang') as Language;
    if (storedLang) setLang(storedLang);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, [settings.theme]);

  const t = translations[lang];

  useEffect(() => {
    if (user && !loading && mode !== 'setup') {
      const checkProfile = async () => {
        if (!db || !user) return;
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const docSnap = await getDocs(q);
        if (docSnap.empty) {
          setMode('setup');
        } else {
          router.push('/');
        }
      };
      checkProfile();
    }
  }, [user, loading, db, router, mode]);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark');
    updateAppSettings({ theme: next ? 'dark' : 'light' });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toLowerCase();
    if (!val.startsWith('@')) {
      val = '@' + val.replace(/@/g, '');
    }
    setUsername(val.replace(/\s/g, ''));
  };

  const resolveTarget = async (input: string) => {
    if (!db) return null;
    let targetEmail = '';
    let foundData: any = null;

    if (input.startsWith('@')) {
      const q = query(collection(db, 'users'), where('username', '==', input.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetEmail = snap.docs[0].data().email;
        foundData = snap.docs[0].data();
      }
    } else if (/^[\d+]+$/.test(input.replace(/[\s-()]/g, ''))) {
      const normalized = normalizePhoneNumber(input);
      const q = query(collection(db, 'users'), where('phoneNumber', '==', normalized), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetEmail = snap.docs[0].data().email;
        foundData = snap.docs[0].data();
      } else {
        targetEmail = `${normalized.replace('+', '')}@${PHONE_EMAIL_DOMAIN}`;
      }
    } else if (input.includes('@')) {
      targetEmail = input.toLowerCase();
    }

    return { targetEmail, foundData };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !emailOrUserOrPhone || !password) return;

    setIsSubmitting(true);
    try {
      const resolved = await resolveTarget(emailOrUserOrPhone);
      const targetEmail = resolved?.targetEmail;

      if (!targetEmail) {
        toast({ variant: 'destructive', title: t.error, description: 'Аккаунт не найден.' });
        setIsSubmitting(false);
        return;
      }

      await signInWithEmailAndPassword(auth, targetEmail, password);
      router.push('/');
    } catch (error: any) {
      let message = 'Ошибка входа.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
        message = 'Неверный пароль.';
      if (error.code === 'auth/user-not-found') message = 'Аккаунт не найден.';
      toast({ variant: 'destructive', title: t.error, description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !emailOrUserOrPhone || !password) return;

    setIsSubmitting(true);
    try {
      const resolved = await resolveTarget(emailOrUserOrPhone);
      const targetEmail = resolved?.targetEmail;

      if (!targetEmail) {
        toast({ variant: 'destructive', title: t.error, description: 'Укажите e-mail, @юзернейм или телефон.' });
        setIsSubmitting(false);
        return;
      }

      if (resolved?.foundData) {
        toast({
          variant: 'destructive',
          title: t.error,
          description: 'Этот аккаунт уже существует. Войдите.',
        });
        setIsSubmitting(false);
        return;
      }

      await createUserWithEmailAndPassword(auth, targetEmail, password);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.error, description: 'Ошибка регистрации.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db || !user) return;

    const finalUsername =
      username === '@' && emailOrUserOrPhone.startsWith('@')
        ? emailOrUserOrPhone.toLowerCase().trim()
        : username.toLowerCase().trim();

    if (finalUsername === '@' || finalUsername.length < 4) {
      toast({ variant: 'destructive', title: t.error, description: 'Юзернейм слишком короткий.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', finalUsername));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        toast({ variant: 'destructive', title: t.error, description: 'Этот юзернейм уже занят.' });
        setIsSubmitting(false);
        return;
      }

      const finalDisplayName = displayName.trim() || user.email?.split('@')[0] || 'User';
      await updateProfile(user, { displayName: finalDisplayName });

      let finalPhone = '';
      if (/^[\d+]+$/.test(emailOrUserOrPhone.replace(/[\s-()]/g, ''))) {
        finalPhone = normalizePhoneNumber(emailOrUserOrPhone);
      }

      const userData = {
        uid: user.uid,
        displayName: finalDisplayName,
        username: finalUsername,
        photoURL: '',
        email: user.email?.toLowerCase(),
        phoneNumber: finalPhone,
        lastSeen: Date.now(),
        status: 'online',
        secretPin: '',
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      toast({ title: t.success, description: `Добро пожаловать в ${APP_NAME}!` });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: t.error, description: error.message || 'Ошибка настройки.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !emailOrUserOrPhone) return;

    setIsSubmitting(true);
    try {
      const resolved = await resolveTarget(emailOrUserOrPhone);
      if (resolved?.foundData) {
        setFoundUserForRecovery(resolved.foundData);
        setRecoveryStep('pin');
      } else {
        toast({ variant: 'destructive', title: t.error, description: 'Аккаунт не найден.' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPin = async () => {
    if (!foundUserForRecovery || !auth) return;
    if (foundUserForRecovery.secretPin && foundUserForRecovery.secretPin === recoveryPin) {
      toast({ title: 'ПИН подтвержден', description: 'Выполняется вход…' });

      try {
        // Для MVP используем ПИН как пароль для входа (если он был установлен админом)
        await signInWithEmailAndPassword(auth, foundUserForRecovery.email, recoveryPin);
        router.push('/');
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'ПИН верный, но Auth-доступ не настроен. Обратитесь к админу.',
        });
      }
    } else {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Неверный ПИН-код.' });
    }
  };

  if (loading) return null;

  const segmentModes: AuthMode[] = ['login', 'register'];

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-0 h-[420px] w-[420px] rounded-full bg-secondary/15 blur-3xl"
      />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high"
        aria-label="Переключить тему"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center gap-10 px-5 py-12 lg:flex-row lg:items-center lg:gap-20">
        {/* Brand panel */}
        <div className="flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <SlinkLogo className="anim-float h-20 w-20 lg:h-24 lg:w-24" />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm font-medium text-on-surface-variant lg:text-base">
            {APP_TAGLINE}
          </p>

          <div className="mt-7 hidden w-full flex-col gap-2.5 lg:flex">
            {[
              { icon: MessagesSquare, text: 'Быстрые личные диалоги и общий чат' },
              { icon: Users, text: 'Группы, каналы и истории в одном месте' },
              { icon: ShieldCheck, text: 'Приватность и восстановление доступа по ПИН' },
            ].map(({ icon: Icon, text }, index) => (
              <div
                key={text}
                style={{ animationDelay: `${120 + index * 90}ms` }}
                className="anim-fade-up flex items-center gap-3 rounded-2xl border border-outline-variant/50 bg-surface-low/70 px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-on-container">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-on-surface-variant">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth card */}
        <div className="anim-pop w-full max-w-md rounded-[32px] border border-outline-variant/60 bg-surface-low p-6 shadow-m3 sm:p-8">
          {(mode === 'login' || mode === 'register') && (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-surface-high p-1">
              {segmentModes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'h-10 rounded-full text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-surface-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {m === 'login' ? t.login : t.registration}
                </button>
              ))}
            </div>
          )}

          {(mode === 'setup' || mode === 'recovery') && (
            <div className="mb-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setRecoveryStep('input');
                  setFoundUserForRecovery(null);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                ← Назад
              </button>
              <span className="m3-label">
                {mode === 'setup' ? 'Настройка профиля' : t.recoveryTitle}
              </span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">{t.emailOrUserOrPhone}</Label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    placeholder="email, @user или номер"
                    required
                    value={emailOrUserOrPhone}
                    onChange={(e) => setEmailOrUserOrPhone(e.target.value)}
                    className="m3-field pl-12"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <Label className="m3-label">{t.password}</Label>
                  <button
                    type="button"
                    onClick={() => setMode('recovery')}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="m3-field pl-12"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !emailOrUserOrPhone || !password}
                className="h-12 w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-m3 transition-transform active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t.enter} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-on-surface-variant">
                Нет аккаунта?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-primary hover:underline"
                >
                  Зарегистрироваться
                </button>
              </p>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">{t.emailOrUserOrPhone}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    placeholder="email, @user или номер"
                    required
                    value={emailOrUserOrPhone}
                    onChange={(e) => setEmailOrUserOrPhone(e.target.value)}
                    className="m3-field pl-12"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Придумайте пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    type="password"
                    placeholder="Минимум 6 символов"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="m3-field pl-12"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !emailOrUserOrPhone || !password}
                className="h-12 w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-m3 transition-transform active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t.createAccount} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-on-surface-variant">
                Уже есть аккаунт?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-primary hover:underline"
                >
                  Войти
                </button>
              </p>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-5 animate-in slide-in-from-right duration-300">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-on-surface">Почти готово</h3>
                <p className="text-xs text-on-surface-variant">
                  Настройте публичный профиль — его увидят собеседники.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Ваше имя</Label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    placeholder="Иван Иванов"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="m3-field pl-12"
                  />
                </div>
              </div>

              {!emailOrUserOrPhone.startsWith('@') && (
                <div className="space-y-1.5">
                  <Label className="m3-label ml-1">Уникальный юзернейм</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm font-bold text-primary">
                      @
                    </span>
                    <Input
                      placeholder="username"
                      required
                      value={username.substring(1)}
                      onChange={handleUsernameChange}
                      className="m3-field pl-10 font-mono"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !displayName || (username === '@' && !emailOrUserOrPhone.startsWith('@'))}
                className="h-12 w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-m3"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Завершить настройку'}
              </Button>
            </form>
          )}

          {mode === 'recovery' && (
            <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary-on-container">
                  <KeyRound className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold text-on-surface">{t.recoveryTitle}</h3>
              </div>

              {recoveryStep === 'input' ? (
                <form onSubmit={handleStartRecovery} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="m3-label ml-1">{t.emailOrUserOrPhone}</Label>
                    <Input
                      placeholder="Для поиска…"
                      required
                      value={emailOrUserOrPhone}
                      onChange={(e) => setEmailOrUserOrPhone(e.target.value)}
                      className="m3-field"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Найти аккаунт'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  {foundUserForRecovery?.secretPin ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="m3-label ml-1">{t.enterPin}</Label>
                        <Input
                          placeholder="Секретный код…"
                          value={recoveryPin}
                          onChange={(e) => setRecoveryPin(e.target.value)}
                          className="m3-field font-mono tracking-[0.3em]"
                        />
                      </div>
                      <Button
                        onClick={handleCheckPin}
                        className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground"
                      >
                        Войти через ПИН
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-3xl border border-destructive/25 bg-destructive/5 p-4 text-center">
                      <p className="text-sm font-semibold text-destructive">ПИН-код не установлен</p>
                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                        {t.noPinDesc}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="mt-6 text-center text-[11px] text-on-surface-variant/70">
            {APP_NAME} · {t.version}
          </p>
        </div>
      </div>
    </div>
  );
}
