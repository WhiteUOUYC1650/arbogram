
"use client";

import { ChatWindow } from "@/components/chat/chat-window";

/**
 * Клиентский компонент чата.
 * Вся логика "use client" находится здесь.
 */
export default function ChatClient({ id }: { id: string }) {
  return <ChatWindow chatId={id} />;
}
