
import { redirect } from "next/navigation";

/**
 * Генерируем пустой список параметров для статического экспорта.
 */
export function generateStaticParams() {
  return [];
}

/**
 * Перенаправляем на главную.
 */
export default function RedirectToRoot() {
  redirect("/");
}
