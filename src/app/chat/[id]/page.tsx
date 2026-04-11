import ChatClient from "./chat-client";

/**
 * Серверный компонент для чата.
 * generateStaticParams необходим для корректного output: export.
 */
export async function generateStaticParams() {
  // Заглушка для статического экспорта
  return [{ id: 'main' }];
}

export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient id={resolvedParams.id} />;
}
