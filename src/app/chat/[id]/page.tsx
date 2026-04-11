
import { redirect } from "next/navigation";

/**
 * Перенаправляем на главную. 
 * Динамические роуты [id] удалены для стабильности APK.
 */
export default function RedirectToRoot() {
  redirect("/");
}
