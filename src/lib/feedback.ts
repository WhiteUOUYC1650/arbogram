'use client';

/**
 * Звуки и вибрация интерфейса без внешних ассетов.
 * Звук синтезируется WebAudio — это не требует загрузки файлов и работает офлайн в APK.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

type SoundKind = 'outgoing' | 'incoming';

export function playMessageSound(kind: SoundKind = 'outgoing') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const now = ctx.currentTime;
    const notes = kind === 'incoming' ? [523.25, 783.99] : [880, 659.25];
    const duration = kind === 'incoming' ? 0.12 : 0.08;

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * duration * 0.9;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch {
    // WebAudio может быть заблокирован до первого жеста — не критично.
  }
}

export function vibrate(pattern: number | number[] = 18) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // некоторые браузеры запрещают вибрацию без жеста
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showMessageNotification({
  title,
  body,
  tag,
}: {
  title: string;
  body: string;
  tag?: string;
}) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  // В открытой вкладке не мешаем — уведомление нужно только когда приложение свёрнуто.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;

  try {
    new Notification(title, {
      body,
      tag: tag ?? 'slink-message',
      icon: '/slink-icon.svg',
      silent: true,
    });
  } catch {
    // Android WebView может не поддерживать конструктор Notification.
  }
}
