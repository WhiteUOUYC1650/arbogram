export interface Reaction {
  key: string;
  emoji: string;
  label: string;
}

/** Ключи латиницей — безопасно для путей полей Firestore. */
export const REACTIONS: Reaction[] = [
  { key: 'like', emoji: '👍', label: 'Нравится' },
  { key: 'love', emoji: '❤️', label: 'Сердце' },
  { key: 'laugh', emoji: '😂', label: 'Смех' },
  { key: 'wow', emoji: '😮', label: 'Удивление' },
  { key: 'sad', emoji: '😢', label: 'Грусть' },
  { key: 'fire', emoji: '🔥', label: 'Огонь' },
];

export type ReactionsMap = Record<string, string[]>;

export function getReactionEmoji(key: string): string {
  return REACTIONS.find((reaction) => reaction.key === key)?.emoji ?? '👍';
}
