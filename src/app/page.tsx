
import ChatPageClient from "./chat/chat-page-client";
import { AuthGuard } from "@/components/auth-guard";

/**
 * Главная страница теперь сразу отображает чаты.
 * Обернута в AuthGuard для проверки авторизации.
 */
export default function RootPage() {
  return (
    <AuthGuard>
      <ChatPageClient />
    </AuthGuard>
  );
}
