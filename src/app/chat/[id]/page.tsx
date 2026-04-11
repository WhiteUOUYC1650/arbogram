
"use client";

import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/chat-window";

// Добавляем для поддержки output: export
export function generateStaticParams() {
  return [];
}

export default function IndividualChatPage() {
  const params = useParams();
  const id = params.id as string;

  return <ChatWindow chatId={id} />;
}
