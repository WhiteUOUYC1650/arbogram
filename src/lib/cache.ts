'use client';

import { PRESERVED_STORAGE_KEYS } from './app-settings';

export interface CacheStats {
  localStorageBytes: number;
  sessionStorageBytes: number;
  cacheEntries: number;
  cacheBytes: number;
  totalBytes: number;
  usage?: number;
  quota?: number;
}

const byteSize = (value: string) => {
  if (typeof Blob !== 'undefined') return new Blob([value]).size;
  return value.length * 2;
};

function storageBytes(storage: Storage | undefined): number {
  if (!storage) return 0;
  let total = 0;
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (!key) continue;
    total += byteSize(key) + byteSize(storage.getItem(key) ?? '');
  }
  return total;
}

async function measureCaches(): Promise<{ entries: number; bytes: number }> {
  if (typeof caches === 'undefined') return { entries: 0, bytes: 0 };

  try {
    const names = await caches.keys();
    let entries = 0;
    let bytes = 0;

    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      entries += requests.length;
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.clone().blob();
          bytes += blob.size;
        }
      }
    }

    return { entries, bytes };
  } catch {
    return { entries: 0, bytes: 0 };
  }
}

export async function getCacheStats(): Promise<CacheStats> {
  if (typeof window === 'undefined') {
    return { localStorageBytes: 0, sessionStorageBytes: 0, cacheEntries: 0, cacheBytes: 0, totalBytes: 0 };
  }

  const localStorageBytes = storageBytes(window.localStorage);
  const sessionStorageBytes = storageBytes(window.sessionStorage);
  const { entries, bytes } = await measureCaches();

  let usage: number | undefined;
  let quota: number | undefined;

  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage;
      quota = estimate.quota;
    } catch {
      // игнорируем — не критично для UI
    }
  }

  return {
    localStorageBytes,
    sessionStorageBytes,
    cacheEntries: entries,
    cacheBytes: bytes,
    totalBytes: localStorageBytes + sessionStorageBytes + bytes + (usage ?? 0),
    usage,
    quota,
  };
}

/**
 * Очищает кэш приложения, НЕ трогая настройки, тему, язык и сессию входа.
 * IndexedDB не чистим специально: там Firebase Auth — иначе пользователя разлогинит.
 */
export async function clearAppCache(): Promise<{ freedBytes: number }> {
  if (typeof window === 'undefined') return { freedBytes: 0 };

  const before = await getCacheStats();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && !PRESERVED_STORAGE_KEYS.includes(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // приватный режим
  }

  try {
    window.sessionStorage.clear();
  } catch {
    // приватный режим
  }

  if (typeof caches !== 'undefined') {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch {
      // нет доступа к Cache API
    }
  }

  try {
    window.localStorage.setItem('slink:lastCacheClear', String(Date.now()));
  } catch {
    // игнорируем
  }

  const after = await getCacheStats();
  return { freedBytes: Math.max(0, before.totalBytes - after.totalBytes) };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}
