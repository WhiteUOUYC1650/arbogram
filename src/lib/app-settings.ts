'use client';

import { useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ChatFontSize = 'small' | 'medium' | 'large';
export type ChatWallpaper = 'default' | 'banner' | 'pattern' | 'plain';
export type MusicProfile = 'none' | 'custom';

export interface AppSettings {
  animations: boolean;
  compactChats: boolean;
  showStories: boolean;
  sendOnEnter: boolean;
  theme: ThemeMode;
  chatFontSize: ChatFontSize;
  chatWallpaper: ChatWallpaper;
  messageSounds: boolean;
  vibration: boolean;
  desktopNotifications: boolean;
  notificationPreview: boolean;
  chatBanner: string | null;
  musicProfile: MusicProfile;
}

export const SETTINGS_STORAGE_KEY = 'slink:settings';

export const PRESERVED_STORAGE_KEYS = [SETTINGS_STORAGE_KEY, 'theme', 'lang'];

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
  chatBanner: null,
  musicProfile: 'none',
};

let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system' ? parsed.theme : 'system',
      chatFontSize: parsed.chatFontSize === 'small' || parsed.chatFontSize === 'medium' || parsed.chatFontSize === 'large' ? parsed.chatFontSize : 'medium',
      chatWallpaper: parsed.chatWallpaper === 'default' || parsed.chatWallpaper === 'banner' || parsed.chatWallpaper === 'pattern' ? parsed.chatWallpaper : 'default',
      chatBanner: parsed.chatBanner || null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function subscribeAppSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAppSettings(): AppSettings {
  if (!cached) {
    cached = readFromStorage();
  }
  return cached;
}

export function resetAppSettings() {
  return updateAppSettings({
    ...DEFAULT_SETTINGS,
    theme: getAppSettings().theme,
  });
}

export function updateAppSettings(patch: Partial<AppSettings>) {
  const next = { ...getAppSettings(), ...patch };
  cached = next;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // приватный режим / нет места — просто живём без сохранения
  }
  applyAppSettings(next);
  listeners.forEach((listener) => listener());
  return next;
}

export function useAppSettings(): AppSettings {
  return useSyncExternalStore(subscribeAppSettings, getAppSettings, () => DEFAULT_SETTINGS);
}

export function syncAppSettingsFromStorage() {
  cached = readFromStorage();
  applyAppSettings(cached);
  listeners.forEach((listener) => listener());
}

export function applyAppSettings(settings: AppSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.classList.toggle('animations-off', !settings.animations);

  root.classList.remove(...['text-size-small', 'text-size-medium', 'text-size-large'] as const);
  root.classList.add('text-size-' + settings.chatFontSize);

  root.dataset.chatWallpaper = settings.chatWallpaper;
  root.dataset.themeMode = settings.theme;

  root.dataset.chatBanner = settings.chatBanner || '';
}
