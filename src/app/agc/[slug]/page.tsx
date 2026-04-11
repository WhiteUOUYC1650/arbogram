
import { redirect } from "next/navigation";

/**
 * Генерируем пустой список параметров для статического экспорта,
 * чтобы избежать ошибки "missing generateStaticParams".
 */
export function generateStaticParams() {
  return [];
}

/**
 * Перенаправляем на главную, так как приложение теперь SPA.
 */
export default function RedirectToRoot() {
  redirect("/");
}
