'use client';

import { useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ChatFontSize = 'small' | 'medium' | 'large';
export type ChatWallpaper = 'default' | 'plain' | 'pattern';

export interface AppSettings {
  /** Плавные анимации интерфейса */
  animations: boolean;
  /** Компактные строки в списке чатов */
  compactChats: boolean;
  /** Показывать блок историй в сайдбаре */
  showStories: boolean;
  /** Enter отправляет сообщение (Shift+Enter — перенос строки) */
  sendOnEnter: boolean;
  /** Светлая / тёмная / системная тема */
  theme: ThemeMode;
  /** Размер текста в переписке */
  chatFontSize: ChatFontSize;
  /** Фон области переписки */
  chatWallpaper: ChatWallpaper;
  /** Звук при отправке и получении сообщений */
  messageSounds: boolean;
  /** Короткая вибрация на сообщения (если поддерживается) */
  vibration: boolean;
  /** Системные уведомления, когда вкладка свёрнута */
  desktopNotifications: boolean;
  /** Показывать текст сообщения в уведомлении */
  notificationPreview: boolean;
}

export const SETTINGS_STORAGE_KEY = 'slink:settings';

/** Эти ключи очистка кэша не трогает — иначе «слетят» тема, язык и настройки. */
export const PRESERVED_STORAGE_KEYS = [SETTINGS_STORAGE_KEY, 'theme', 'lang'];

/** Legacy-ключи Firebase Auth: чистить их нельзя, иначе пользователя разлогинит. */
export const PRESERVED_STORAGE_PREFIXES = ['firebase:', 'slink:settings'];

export const DEFAULT_SETTINGS: AppSettings = {
  animations: true,
  compactChats: false,
  showStories: true,
  sendOnEnter: true,
  theme: 'system',
  chatFontSize: 'medium',
  chatWallpaper: 'default',
  messageSounds: true,
  vibration: true,
  desktopNotifications: false,
  notificationPreview: true,
};

const FONT_CLASSES = ['text-size-small', 'text-size-medium', 'text-size-large'] as const;

let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isFontSize(value: unknown): value is ChatFontSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

function isWallpaper(value: unknown): value is ChatWallpaper {
  return value === 'default' || value === 'plain' || value === 'pattern';
}

function readFromStorage(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};

    // Раньше тема жила в отдельном ключе `theme` — поддерживаем миграцию.
    let theme: ThemeMode = isThemeMode(parsed.theme) ? parsed.theme : 'system';
    if (!isThemeMode(parsed.theme)) {
      const legacyTheme = window.localStorage.getItem('theme');
      if (legacyTheme === 'dark' || legacyTheme === 'light') theme = legacyTheme;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme,
      chatFontSize: isFontSize(parsed.chatFontSize) ? parsed.chatFontSize : DEFAULT_SETTINGS.chatFontSize,
      chatWallpaper: isWallpaper(parsed.chatWallpaper) ? parsed.chatWallpaper : DEFAULT_SETTINGS.chatWallpaper,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Какая тема реально применится: для `system` смотрим настройку ОС. */
export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light';
  return theme;
}

/** Применяем настройки к <html>: CSS-классы управляют анимациями, темой и плотностью. */
export function applyAppSettings(settings: AppSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.classList.toggle('animations-off', !settings.animations);

  root.classList.remove(...FONT_CLASSES);
  root.classList.add(`text-size-${settings.chatFontSize}`);

  root.dataset.chatWallpaper = settings.chatWallpaper;
  root.dataset.themeMode = settings.theme;

  const theme = resolveTheme(settings.theme);
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function getAppSettings(): AppSettings {
  if (!cached) {
    cached = readFromStorage();
  }
  return cached;
}

/** Перечитывает настройки из localStorage (например, после изменения в другой вкладке). */
export function syncAppSettingsFromStorage() {
  cached = readFromStorage();
  applyAppSettings(cached);
  listeners.forEach((listener) => listener());
}

export function subscribeAppSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateAppSettings(patch: Partial<AppSettings>) {
  const next = { ...getAppSettings(), ...patch };
  cached = next;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    // Дублируем тему в старый ключ: его читает скрипт в <head> до гидратации.
    if (patch.theme) window.localStorage.setItem('theme', next.theme);
  } catch {
    // приватный режим / нет места — просто живём без сохранения
  }
  applyAppSettings(next);
  listeners.forEach((listener) => listener());
  return next;
}

/** Сброс оформления: тему и язык намеренно сохраняем (как в Telegram). */
export function resetAppSettings() {
  const current = getAppSettings();
  return updateAppSettings({
    ...DEFAULT_SETTINGS,
    theme: current.theme,
  });
}

/** Реактивные настройки: компонент перерисуется при любом изменении. */
export function useAppSettings(): AppSettings {
  return useSyncExternalStore(subscribeAppSettings, getAppSettings, () => DEFAULT_SETTINGS);
}
