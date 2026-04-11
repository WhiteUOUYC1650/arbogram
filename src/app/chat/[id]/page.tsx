import ChatClient from "./chat-client";

/**
 * Обязательно для output: export в Next.js 15 для динамических роутов.
 * Этот файл является серверным компонентом (без 'use client').
 */
export function generateStaticParams() {
  // Возвращаем пустой массив, чтобы Next.js создал шаблон для динамического роута при экспорте.
  return [];
}

/**
 * Запрещаем генерацию динамических параметров во время работы приложения (поскольку сервера нет).
 */
export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient id={resolvedParams.id} />;
}
