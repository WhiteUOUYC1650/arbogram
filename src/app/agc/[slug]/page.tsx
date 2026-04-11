
import { redirect } from "next/navigation";

/**
 * Перенаправляем на главную чата.
 */
export default function RedirectToChatSlug() {
  redirect("/chat");
}
