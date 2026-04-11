
import { redirect } from "next/navigation";

/**
 * Теперь чаты живут на главной странице (/).
 * Перенаправляем любого, кто попадет сюда по старой ссылке.
 */
export default function ChatPageRedirect() {
  redirect("/");
}
