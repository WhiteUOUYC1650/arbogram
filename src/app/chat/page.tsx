
import { redirect } from "next/navigation";

/**
 * Перенаправляем на главную.
 */
export default function ChatPageRedirect() {
  redirect("/");
}
