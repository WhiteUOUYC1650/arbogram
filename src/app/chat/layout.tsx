
import { AuthGuard } from "@/components/auth-guard";

/**
 * Упрощенный лайаут. 
 * Вся навигация и структура теперь живет внутри src/app/chat/page.tsx,
 * чтобы избежать проблем с динамическими роутами в APK.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="h-[100dvh] w-full overflow-hidden bg-background">
        {children}
      </div>
    </AuthGuard>
  );
}
