
import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Сайдбар виден только на десктопе в этом лейауте */}
      <div className="w-80 flex-shrink-0 hidden md:block border-r bg-sidebar/50 backdrop-blur-sm">
        <ChatSidebar />
      </div>
      <main className="flex-1 relative h-full">
        {children}
      </main>
    </div>
  );
}
