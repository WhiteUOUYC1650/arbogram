import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

/** Технический идентификатор служебного аккаунта (не существует в /users). */
export const SERVICE_BOT_ID = 'slink-bot';
export const SERVICE_BOT_NAME = 'SLink';
export const SERVICE_CHAT_TYPE = 'service';

/** Детерминированный id чата с ботом — один на пользователя, без дублей и без индексов. */
export const serviceChatId = (uid: string) => `service_${uid}`;

export const isServiceChatId = (chatId?: string | null) =>
  Boolean(chatId && chatId.startsWith('service_'));

type BotKind = 'info' | 'welcome' | 'update';

const WELCOME_MESSAGES: { text: (name: string) => string; kind: BotKind }[] = [
  {
    text: (name) => `Привет, ${name}! Это служебный аккаунт ${SERVICE_BOT_NAME}.`,
    kind: 'welcome',
  },
  {
    text: () =>
      'Здесь будут важные уведомления: изменения профиля, новые группы и каналы, обновления приложения.',
    kind: 'info',
  },
  {
    text: () => 'Отвечать не нужно — этот чат только для уведомлений. Спасибо, что вы с SLink 💜',
    kind: 'info',
  },
];

async function postBotMessage(
  db: Firestore,
  chatId: string,
  text: string,
  kind: BotKind = 'info',
  updatePreview = true,
) {
  const timestamp = Date.now();

  await addDoc(collection(db, 'chats', chatId, 'messages'), {
    senderId: SERVICE_BOT_ID,
    senderName: SERVICE_BOT_NAME,
    type: 'text',
    bot: true,
    botKind: kind,
    text,
    timestamp,
  });

  if (updatePreview) {
    await updateDoc(doc(db, 'chats', chatId), { lastMessage: text, lastMessageTime: timestamp });
  }
}

/**
 * Возвращает id служебного чата, создавая его (и приветственные сообщения)
 * при первом обращении. Клиентская логика — Cloud Functions в проекте нет.
 */
export async function ensureServiceChat(
  db: Firestore | null | undefined,
  user: User | null | undefined,
  displayName?: string | null,
): Promise<string | null> {
  if (!db || !user) return null;

  const chatRef = doc(db, 'chats', serviceChatId(user.uid));

  try {
    const existing = await getDoc(chatRef);
    if (existing.exists()) {
      const participants = existing.data()?.participants as string[] | undefined;
      // Если пользователь когда-то «вышел» из служебного чата — возвращаем доступ
      if (participants && !participants.includes(user.uid)) {
        await setDoc(chatRef, { participants: [...participants, user.uid] }, { merge: true });
      }
      return chatRef.id;
    }
  } catch (error) {
    console.warn('[SLink] Не удалось прочитать служебный чат, пересоздаём:', error);
  }

  const now = Date.now();
  const name = displayName?.trim() || user.displayName || 'друг';

  await setDoc(chatRef, {
    participants: [user.uid],
    type: SERVICE_CHAT_TYPE,
    isService: true,
    name: SERVICE_BOT_NAME,
    ownerId: SERVICE_BOT_ID,
    lastMessage: 'Служебные уведомления SLink',
    lastMessageTime: now,
    createdAt: serverTimestamp(),
  });

  for (const message of WELCOME_MESSAGES) {
    await postBotMessage(db, chatRef.id, message.text(name), message.kind, false);
  }

  await updateDoc(chatRef, {
    lastMessage: 'Служебные уведомления SLink',
    lastMessageTime: now,
  });

  return chatRef.id;
}

/**
 * Отправляет уведомление от бота (создавая служебный чат при необходимости).
 * Используется для событий аккаунта: профиль, аватар, созданные чаты и каналы.
 */
export async function notifyServiceBot(
  db: Firestore | null | undefined,
  user: User | null | undefined,
  displayName: string | null | undefined,
  text: string,
) {
  if (!db || !user || !text.trim()) return;

  try {
    const chatId = await ensureServiceChat(db, user, displayName);
    if (!chatId) return;
    await postBotMessage(db, chatId, text.trim(), 'update');
  } catch (error) {
    // Уведомление не должно ломать основной сценарий
    console.warn('[SLink] Не удалось отправить уведомление бота:', error);
  }
}
