
"use client";

import * as React from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { cn } from "@/lib/utils";

/**
 * Основной интерфейс мессенджера (SPA).
 * CoveChat v1.4.1 "Redirection"
 */
export default function ChatPageClient() {
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const isMobile = useIsMobile();

  // На мобилках: если выбран чат, показываем окно, если нет - сайдбар.
  // На десктопе: показываем и то, и другое.
  const showSidebar = !isMobile || !activeChatId;
  const showChat = activeChatId || !isMobile;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Левая панель (Сайдбар) */}
      <div className={cn(
        "w-full md:w-80 flex-shrink-0 border-r bg-sidebar/50 backdrop-blur-sm transition-all duration-300",
        !showSidebar && "hidden md:block"
      )}>
        <ChatSidebar 
          activeChatId={activeChatId || undefined} 
          onChatSelect={(id) => setActiveChatId(id)} 
        />
      </div>

      {/* Основная область (Окно чата или заглушка) */}
      <main className={cn(
        "flex-1 relative h-full overflow-hidden transition-all duration-300",
        !showChat && "hidden md:flex flex-col items-center justify-center p-8 text-center space-y-6"
      )}>
        {activeChatId ? (
          <ChatWindow 
            chatId={activeChatId} 
            onBack={() => setActiveChatId(null)} 
          />
        ) : (
          <div className="hidden md:flex h-full flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-700">
            <ArbogramIcon className="w-32 h-32" />
            <div className="space-y-2">
              <h2 className="text-5xl font-bold font-headline text-foreground tracking-tighter">CoveChat</h2>
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-primary/30" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">Redirection v1.4.1</p>
                <span className="h-px w-8 bg-primary/30" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
