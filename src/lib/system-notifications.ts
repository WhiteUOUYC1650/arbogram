import { addDoc, collection, doc, updateDoc, type Firestore } from 'firebase/firestore';

export type SystemMessageKind = 'info' | 'created' | 'joined' | 'left' | 'channel';

/**
 * Служебное уведомление — это обычный документ в messages с type: 'system'.
 * Такие сообщения нельзя переслать или ответить на них: в ленте они
 * показываются по центру компактной «пилюлей» (см. components/chat/system-message).
 *
 * @param text текст уведомления, например «Группа «Проект» создана»
 * @param kind тон/иконка уведомления
 * @param updateChatPreview обновлять ли превью чата (последнее сообщение и время)
 */
export async function sendSystemNotification(
  db: Firestore | null | undefined,
  chatId: string | null | undefined,
  text: string,
  kind: SystemMessageKind = 'info',
  updateChatPreview = true,
) {
  if (!db || !chatId || !text?.trim()) return;

  const timestamp = Date.now();
  const cleanText = text.trim();

  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId: 'system',
      senderName: 'SLink',
      type: 'system',
      systemKind: kind,
      text: cleanText,
      timestamp,
    });

    if (updateChatPreview) {
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: cleanText,
        lastMessageTime: timestamp,
      });
    }
  } catch (error) {
    // Уведомление не должно ломать основной сценарий (например, при отсутствии прав)
    console.warn('[SLink] Не удалось отправить служебное уведомление:', error);
  }
}
