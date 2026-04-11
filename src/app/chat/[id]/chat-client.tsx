"use client";

import { ChatWindow } from "@/components/chat/chat-window";

/**
 * Клиентский компонент, содержащий всю логику чата.
 * Отделен от page.tsx, чтобы не конфликтовать с generateStaticParams.
 */
export default function ChatClient({ id }: { id: string }) {
  return <ChatWindow chatId={id} />;
}
