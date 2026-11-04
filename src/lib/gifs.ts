/** Небольшая подборка публичных GIF для отправки в чат. */
export interface GifItem {
  id: string;
  title: string;
  url: string;
}

export const GIF_LIBRARY: GifItem[] = [
  {
    id: 'hello',
    title: 'Привет',
    url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  },
  {
    id: 'love',
    title: 'Любовь',
    url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  },
  {
    id: 'laugh',
    title: 'Смех',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
  },
  {
    id: 'clap',
    title: 'Аплодисменты',
    url: 'https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif',
  },
  {
    id: 'party',
    title: 'Праздник',
    url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  },
  {
    id: 'ok',
    title: 'Окей',
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  },
  {
    id: 'wow',
    title: 'Вау',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
  },
  {
    id: 'sleep',
    title: 'Спокойной ночи',
    url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif',
  },
];
