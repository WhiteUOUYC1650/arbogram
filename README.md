# SLink Messenger

**SLink** — современный мессенджер на Next.js + Firebase: личные диалоги, группы,
каналы, истории, стикеры, опросы и голосовые сообщения.

## Стек

- **Next.js 15** (App Router, статический экспорт в `out/`)
- **React 19** + **TypeScript**
- **Tailwind CSS 3** + shadcn/ui + **Material 3** дизайн-токены
- **Firebase** (Auth + Firestore)
- **Capacitor** (Android-сборка)

## Запуск

```bash
npm install
npm run dev      # http://localhost:9002
```

Полезные скрипты:

```bash
npm run dev        # dev-сервер
npm run typecheck  # проверка типов
npm run build      # production-сборка (static export)
npm run cap:sync   # синхронизация Capacitor
```

## Структура

```
src/app            маршруты (/, /login, /admin, /agc/[slug])
src/components     UI: чаты, истории, настройки, shadcn/ui
src/components/ui  примитивы shadcn/ui
src/lib/brand.ts   единый источник брендинга (название, версия, слоган)
src/lib/i18n.ts    локализации (ru/en)
```

## Брендинг и тема

Все названия, версия и слоган вынесены в [`src/lib/brand.ts`](src/lib/brand.ts) —
меняйте их там, а не по файлам. Палитра и типографика Material 3 живут в
[`src/app/globals.css`](src/app/globals.css) (роли `surface-*`, `primary-container`,
`secondary-container`, `outline-variant` и т. д.) и подключены к Tailwind в
[`tailwind.config.ts`](tailwind.config.ts).

Тема запоминается в `localStorage` (`theme`), язык — в `localStorage` (`lang`).
