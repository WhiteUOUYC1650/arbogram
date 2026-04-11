
"use client";

import * as React from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { cn } from "@/lib/utils";

/**
 * Главная страница чата. 
 * Теперь управляет состоянием выбранного чата локально, 
 * чтобы избежать проблем с навигацией в APK.
 */
export default function ChatPage() {
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
              <h2 className="text-4xl font-bold font-headline text-foreground tracking-tight">Arbogram</h2>
              <p className="text-muted-foreground max-w-sm">
                Выберите чат, чтобы начать общение. Версия v0.1
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8 text-left">
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/20 border border-primary/10 space-y-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">Б</span>
                </div>
                <p className="text-sm font-semibold">Быстро</p>
                <p className="text-[10px] text-muted-foreground">Мгновенная доставка сообщений.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-black/20 border border-primary/10 space-y-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">Н</span>
                </div>
                <p className="text-sm font-semibold">Надежно</p>
                <p className="text-[10px] text-muted-foreground">Ваши данные под защитой.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
