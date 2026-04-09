
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { AuthGuard } from "@/components/auth-guard";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <div className="w-80 flex-shrink-0 hidden md:block border-r bg-sidebar/50 backdrop-blur-sm">
          <ChatSidebar />
        </div>
        <main className="flex-1 relative h-full overflow-hidden">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
