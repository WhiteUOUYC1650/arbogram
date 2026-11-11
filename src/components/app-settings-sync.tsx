'use client';

import { useEffect } from 'react';

import {
  SETTINGS_STORAGE_KEY,
  applyAppSettings,
  getAppSettings,
  syncAppSettingsFromStorage,
  useAppSettings,
} from '@/lib/app-settings';

/** Синхронизирует пользовательские настройки с классом на <html>. */
export function AppSettingsSync() {
  const settings = useAppSettings();

  useEffect(() => {
    applyAppSettings(settings);
  }, [settings]);

  // Изменения в другой вкладке (или после очистки кэша) подхватываем без перезагрузки.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SETTINGS_STORAGE_KEY || event.key === 'theme') {
        syncAppSettingsFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Для темы «как в системе» следим за переключением оформления ОС.
  useEffect(() => {
    if (settings.theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyAppSettings(getAppSettings());
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [settings.theme]);

  return null;
}
