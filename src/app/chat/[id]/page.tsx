import ChatClient from "./chat-client";

/**
 * Обязательно для output: export в Next.js 15 для динамических роутов.
 */
export function generateStaticParams() {
  return [];
}

/**
 * Запрещаем генерацию на лету для статического экспорта.
 */
export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient id={resolvedParams.id} />;
}
