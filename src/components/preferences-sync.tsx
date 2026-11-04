'use client';

import { useEffect } from 'react';

import { useUserPrefs } from '@/lib/user-prefs';
import { applyGlobalPalette } from '@/lib/palettes';

/** Применяет сохранённую палитру пользователя к документу. */
export function PreferencesSync() {
  const { prefs } = useUserPrefs();

  useEffect(() => {
    applyGlobalPalette(prefs.palette);
  }, [prefs.palette]);

  return null;
}
