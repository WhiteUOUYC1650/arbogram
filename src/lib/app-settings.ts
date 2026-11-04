'use client';

import { useSyncExternalStore } from 'react';

export interface AppSettings {
  /** Плавные анимации интерфейса */
  animations: boolean;
  /** Компактные строки в списке чатов */
  compactChats: boolean;
  /** Показывать блок историй в сайдбаре */
  showStories: boolean;
  /** Enter отправляет сообщение (Shift+Enter — перенос строки) */
  sendOnEnter: boolean;
  /** Локальные уведомления о новых сообщениях */
  notifications: boolean;
}

export const SETTINGS_STORAGE_KEY = 'slink:settings';

/** Эти ключи очистка кэша не трогает — иначе «слетят» тема, язык и настройки. */
export const PRESERVED_STORAGE_KEYS = [SETTINGS_STORAGE_KEY, 'theme', 'lang'];

export const DEFAULT_SETTINGS: AppSettings = {
  animations: true,
  compactChats: false,
  showStories: true,
  sendOnEnter: true,
  notifications: false,
};

let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Применяем настройки к <html>: CSS-классы управляют анимациями и плотностью. */
export function applyAppSettings(settings: AppSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('animations-off', !settings.animations);
}

export function getAppSettings(): AppSettings {
  if (!cached) {
    cached = readFromStorage();
  }
  return cached;
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
  } catch {
    // приватный режим / нет места — просто живём без сохранения
  }
  applyAppSettings(next);
  listeners.forEach((listener) => listener());
  return next;
}

export function resetAppSettings() {
  return updateAppSettings(DEFAULT_SETTINGS);
}

/** Реактивные настройки: компонент перерисуется при любом изменении. */
export function useAppSettings(): AppSettings {
  return useSyncExternalStore(subscribeAppSettings, getAppSettings, () => DEFAULT_SETTINGS);
}
