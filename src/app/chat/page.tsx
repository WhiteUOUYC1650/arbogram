
import ChatPageClient from "./chat-page-client";

/**
 * Серверная часть главной страницы чата.
 * Просто возвращает клиентский компонент для обеспечения чистоты структуры.
 */
export default function ChatPage() {
  return <ChatPageClient />;
}
