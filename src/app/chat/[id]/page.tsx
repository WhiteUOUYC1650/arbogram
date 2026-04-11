import ChatClient from "./chat-client";

// Для output: export нам нужно вернуть хотя бы пустой массив для динамических роутов
export function generateStaticParams() {
  return [];
}

// Запрещаем генерацию параметров на лету, так как в APK нет сервера
export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient id={resolvedParams.id} />;
}
