
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-80 flex-shrink-0 hidden md:block">
        <ChatSidebar />
      </div>
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
}
