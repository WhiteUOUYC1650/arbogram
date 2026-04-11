
import { redirect } from "next/navigation";

/**
 * Перенаправляем на главную чата.
 * Теперь чаты работают через локальное состояние в /chat/page.tsx,
 * что надежнее для мобильных APK.
 */
export default function RedirectToChat() {
  redirect("/chat");
}
