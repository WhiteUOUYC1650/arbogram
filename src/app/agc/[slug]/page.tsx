
import { redirect } from "next/navigation";

/**
 * Перенаправляем на главную.
 */
export default function RedirectToRoot() {
  redirect("/");
}
