'use client';

import { doc, updateDoc } from 'firebase/firestore';

import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { DEFAULT_CHAT_APPEARANCE, type ChatAppearance, type PaletteId } from '@/lib/palettes';

export type Visibility = 'everyone' | 'contacts' | 'nobody';

export interface PrivacySettings {
  lastSeen: Visibility;
  profilePhoto: Visibility;
  whoCanMessage: Visibility;
  readReceipts: boolean;
}

export interface DeviceSession {
  id: string;
  device: string;
  platform: string;
  createdAt: number;
  lastActive: number;
}

export interface AccessKey {
  id: string;
  value: string;
  createdAt: number;
}

export interface ChatFolder {
  id: string;
  name: string;
  chatIds: string[];
}

export interface UserPrefs {
  palette: PaletteId;
  privacy: PrivacySettings;
  chatSettings: Record<string, ChatAppearance>;
  folders: ChatFolder[];
  sessions: DeviceSession[];
  accessKeys: AccessKey[];
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  lastSeen: 'everyone',
  profilePhoto: 'everyone',
  whoCanMessage: 'everyone',
  readReceipts: true,
};

export const DEFAULT_PREFS: UserPrefs = {
  palette: 'violet',
  privacy: DEFAULT_PRIVACY,
  chatSettings: {},
  folders: [],
  sessions: [],
  accessKeys: [],
};

export const DEVICE_ID_STORAGE_KEY = 'slink:device-id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
    const id = `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return 'dev_fallback';
  }
}

export function describeDevice(): { device: string; platform: string } {
  if (typeof navigator === 'undefined') return { device: 'Неизвестное устройство', platform: '—' };

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  const platform = isAndroid
    ? 'Android'
    : isIOS
      ? 'iOS'
      : isWindows
        ? 'Windows'
        : isMac
          ? 'macOS'
          : isLinux
            ? 'Linux'
            : 'Web';

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /YaBrowser/i.test(ua)
        ? 'Yandex'
        : /Chrome\//i.test(ua)
          ? 'Chrome'
          : /Firefox\//i.test(ua)
            ? 'Firefox'
            : /Safari\//i.test(ua)
              ? 'Safari'
              : 'Browser';

  return { device: `${browser} · ${platform}`, platform };
}

export function mergePrefs(raw: any): UserPrefs {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;

  return {
    palette: (raw.palette as PaletteId) || DEFAULT_PREFS.palette,
    privacy: { ...DEFAULT_PRIVACY, ...(raw.privacy || {}) },
    chatSettings: raw.chatSettings || {},
    folders: Array.isArray(raw.folders) ? raw.folders : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    accessKeys: Array.isArray(raw.accessKeys) ? raw.accessKeys : [],
  };
}

/** Читает и обновляет пользовательские настройки в users/{uid}.prefs. */
export function useUserPrefs() {
  const db = useFirestore();
  const { user } = useUser();

  const userRef = useMemoFirebase(
    () => (db && user ? doc(db, 'users', user.uid) : null),
    [db, user?.uid],
  );

  const { data, loading } = useDoc(userRef);
  const prefs = mergePrefs(data?.prefs);

  const update = async (patch: Record<string, any>) => {
    if (!userRef) return;
    await updateDoc(userRef, patch);
  };

  return {
    prefs,
    loading,
    update,
    setPalette: (palette: PaletteId) => update({ 'prefs.palette': palette }),
    setPrivacy: (privacy: PrivacySettings) => update({ 'prefs.privacy': privacy }),
    setChatAppearance: (chatId: string, appearance: ChatAppearance) =>
      update({ [`prefs.chatSettings.${chatId}`]: appearance }),
    resetChatAppearance: (chatId: string) =>
      update({ [`prefs.chatSettings.${chatId}`]: DEFAULT_CHAT_APPEARANCE }),
    setFolders: (folders: ChatFolder[]) => update({ 'prefs.folders': folders }),
    setSessions: (sessions: DeviceSession[]) => update({ 'prefs.sessions': sessions }),
    setAccessKeys: (accessKeys: AccessKey[]) => update({ 'prefs.accessKeys': accessKeys }),
  };
}
