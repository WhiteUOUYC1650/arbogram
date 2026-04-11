import ChatClient from "./chat-client";

/**
 * Серверный компонент для чата.
 * generateStaticParams необходим для корректного output: export.
 */
export async function generateStaticParams() {
  // Заглушка для статического экспорта. Для APK это критично.
  return [{ id: 'main' }];
}

/**
 * dynamicParams = false запрещает генерацию путей в рантайме (что невозможно в APK).
 */
export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient id={resolvedParams.id} />;
}
