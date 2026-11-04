'use client';

import { useEffect, useRef } from 'react';

import { useUser } from '@/firebase';
import { describeDevice, getDeviceId, useUserPrefs, type DeviceSession } from '@/lib/user-prefs';

/** Регистрирует текущее устройство в списке активных сеансов пользователя. */
export function SessionTracker() {
  const { user } = useUser();
  const { prefs, loading, setSessions } = useUserPrefs();
  const done = useRef(false);

  useEffect(() => {
    if (!user || loading || done.current) return;
    done.current = true;

    const id = getDeviceId();
    const { device, platform } = describeDevice();
    const now = Date.now();
    const existing = prefs.sessions.find((session) => session.id === id);

    const next: DeviceSession[] = existing
      ? prefs.sessions.map((session) =>
          session.id === id ? { ...session, device, platform, lastActive: now } : session,
        )
      : [...prefs.sessions, { id, device, platform, createdAt: now, lastActive: now }].slice(-10);

    setSessions(next).catch((error) => console.warn('[SLink] Не удалось обновить сеанс:', error));
  }, [user, loading, prefs.sessions, setSessions]);

  return null;
}
