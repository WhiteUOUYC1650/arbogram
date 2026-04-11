import { redirect } from "next/navigation";

/**
 * Обязательно для output: export.
 */
export async function generateStaticParams() {
  return [{ id: 'main' }];
}

export default function ChatRedirectPage() {
  redirect("/");
}