
"use client";

import { useParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/chat-window";

export default function IndividualChatPage() {
  const params = useParams();
  const id = params.id as string;

  return <ChatWindow chatId={id} />;
}
