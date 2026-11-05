# Составные индексы Firestore для SLink

Firestore сам создаёт индексы для одиночных полей, но для части запросов из приложения нужны
**составные** индексы. Если индекса нет, консоль/тост покажет ошибку вида
`The query requires an index. You can create it here: …` со ссылкой на автo-создание.

## Обязательные

| Коллекция | Поля | Режим | Где используется |
|---|---|---|---|
| `chats` | `isPublic` ASC, `name` ASC | Collection | глобальный поиск каналов (`chat-sidebar.tsx`) |
| `chats` | `type` ASC, `participants` ARRAY | Collection | поиск существующего личного диалога (`create-chat-dialog.tsx`, `chat-page-client.tsx`) |
| `chats` | `isPublic` ASC, `slug` ASC | Collection | открытие канала по ссылке (старые каналы) |

## Как создать

1. Откройте Firebase Console → **Firestore Database → Indexes → Composite**.
2. Create index → выберите коллекцию и поля из таблицы, режим `Collection`.
3. Дождитесь статуса **Enabled** (обычно 1–5 минут).

Либо запустите приложение, повторите действие (поиск/создание чата) и перейдите по ссылке
`create it here:` из текста ошибки в консоли.

## Одиночные (создаются автоматически)

- `users.username` — поиск по @юзернейму (range-запрос).
- `chats.lastMessageTime`, `messages.timestamp`, `stories.timestamp` — сортировки.
