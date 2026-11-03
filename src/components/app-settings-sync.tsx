'use client';

import { useEffect } from 'react';

import { applyAppSettings, useAppSettings } from '@/lib/app-settings';

/** Синхронизирует пользовательские настройки с классом на <html>. */
export function AppSettingsSync() {
  const settings = useAppSettings();

  useEffect(() => {
    applyAppSettings(settings);
  }, [settings]);

  return null;
}
