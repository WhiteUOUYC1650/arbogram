
import { redirect } from "next/navigation";

/**
 * Генерируем заглушку для статического билда.
 */
export function generateStaticParams() {
  return [{ id: 'main' }];
}

/**
 * Все прямые заходы на /chat/[id] перенаправляем на главную,
 * так как приложение теперь SPA и все чаты живут в корне.
 */
export default function ChatRedirectPage() {
  redirect("/");
}
