/** Пресеты оформления профиля: баннеры и музыка. */

export interface BannerPreset {
  id: string;
  label: string;
  className: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  { id: 'violet', label: 'Violet', className: 'bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400' },
  { id: 'sunset', label: 'Sunset', className: 'bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-500' },
  { id: 'forest', label: 'Forest', className: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500' },
  { id: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600' },
  { id: 'graphite', label: 'Graphite', className: 'bg-gradient-to-br from-zinc-600 via-zinc-800 to-black' },
  { id: 'candy', label: 'Candy', className: 'bg-gradient-to-br from-pink-300 via-rose-400 to-purple-400' },
];

export function getBannerClass(presetId?: string | null): string {
  return BANNER_PRESETS.find((preset) => preset.id === presetId)?.className ?? BANNER_PRESETS[0].className;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

/** Демо-треки: свободные примеры SoundHelix (можно указать и свою ссылку). */
export const MUSIC_PRESETS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'SLink Anthem',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'track-2',
    title: 'Night Drive',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'track-3',
    title: 'Soft Focus',
    artist: 'SoundHelix',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  },
];

export interface ProfileMusic {
  title: string;
  artist?: string;
  url: string;
}

/** «был(а) в сети …» с относительным временем. */
export function formatLastSeen(timestamp?: number | null): string {
  if (!timestamp) return 'недавно';

  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;

  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function formatBirthDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
