'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Мост к нативному Android-плагину slink-native.
 * На вебе методы просто не вызываются (см. проверки `Capacitor.isNativePlatform()`),
 * поэтому один и тот же код работает и в браузере, и в APK.
 */
interface SlinkNativePlugin {
  checkMicrophonePermission(): Promise<{ granted: boolean }>;
  requestMicrophonePermission(): Promise<{ granted: boolean }>;
}

export const SlinkNative = registerPlugin<SlinkNativePlugin>('SlinkNative');

export type MicrophonePermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/** Статус разрешения на микрофон без показа системного диалога. */
export async function getMicrophonePermissionState(): Promise<MicrophonePermissionState> {
  if (isNativeApp()) {
    try {
      const result = await SlinkNative.checkMicrophonePermission();
      return result.granted ? 'granted' : 'prompt';
    } catch {
      return 'unknown';
    }
  }

  try {
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    return status.state as MicrophonePermissionState;
  } catch {
    return 'unknown';
  }
}

/**
 * Запрашивает доступ к микрофону.
 * В APK сначала дергаем нативный запрос (системный диалог Android),
 * затем уже getUserMedia — так WebView не «молчит» при отказе.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const current = await SlinkNative.checkMicrophonePermission();
      if (current.granted) return true;
      const requested = await SlinkNative.requestMicrophonePermission();
      return Boolean(requested.granted);
    } catch {
      // Плагин недоступен (старая сборка) — ниже попробуем обычный getUserMedia.
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/** Перед записью в APK гарантируем, что системное разрешение уже выдано. */
export async function ensureNativeMicrophonePermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const current = await SlinkNative.checkMicrophonePermission();
    if (current.granted) return true;
    const requested = await SlinkNative.requestMicrophonePermission();
    return Boolean(requested.granted);
  } catch {
    return true;
  }
}
