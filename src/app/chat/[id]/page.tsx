import ChatClient from "./chat-client";

export function generateStaticParams() {
  // Для статического экспорта динамических путей в SPA стиле
  return [];
}

export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatClient id={id} />;
}
