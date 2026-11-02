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

## Служебные уведомления

- **Служебный бот «SLink»** — закреплённый чат в сайдбаре (`src/lib/service-bot.ts`):
  приветствие, уведомления об изменении профиля/аватара, о созданных группах и каналах.
  Чат создаётся лениво при первом открытии (`chats/service_<uid>`), отвечать в нём нельзя.
- **Системные сообщения внутри чатов** (`src/lib/system-notifications.ts`):
  «диалог создан», «группа создана», «канал создан», «вы покинули чат»,
  «пользователь присоединился к общему чату». Рендерятся по центру ленты
  (`components/chat/system-message.tsx`), не являются сообщениями пользователя.

## Голосовые сообщения

Запись: тап по микрофону → таймер и кнопки «отменить»/«отправить».
Ограничения: 90 секунд и ~900 КБ base64 (лимит документа Firestore — 1 МБ).
Формат выбирается автоматически (`audio/webm;codecs=opus`, fallback `audio/mp4` для Safari).
Плеер (`VoiceMessage`) — play/pause, «волна» с прогрессом и длительностью.

## Сборка APK (GitHub Actions)

Готовый исправленный воркфлоу лежит в [`docs/ci/build.yml`](docs/ci/build.yml) — скопируйте его в
`.github/workflows/build.yml` (файла `main.yml` в репозитории нет). Автоматически заменить
воркфлоу агент не может: у GitHub App нет права `workflows`.

Запускается на push в **любую** ветку, на PR в `main` и вручную (`Run workflow`) — раньше триггер был только `push → main`,
поэтому сборки с рабочих веток (например `cline/*`) вообще не стартовали.

Что важно для успешной сборки:

- **JDK 17**, а не 21: Capacitor 6 использует AGP 8.2/Gradle 8.2, которые с JDK 21 падают.
- Детерминированная установка зависимостей — `npm ci`.
- `npx cap add android`, если платформа отсутствует/неполная, затем `npx cap sync android`.
- Готовый файл — артефакт **`slink-debug-apk`** (`android/app/build/outputs/apk/debug/app-debug.apk`).

Секреты репозитория (Settings → Secrets and variables → Actions), опционально:
`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`. Если их нет — используются значения по умолчанию из
`src/firebase/config.ts`.
