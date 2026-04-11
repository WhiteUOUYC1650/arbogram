"use client";

import { ChatWindow } from "@/components/chat/chat-window";

export default function ChatClient({ id }: { id: string }) {
  return <ChatWindow chatId={id} />;
}
