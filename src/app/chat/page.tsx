
"use client";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArbogramIcon } from "@/components/arbogram-icon";

export default function ChatPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-full bg-background">
        <ChatSidebar />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-700">
      <ArbogramIcon className="w-32 h-32" />
      <div className="space-y-2">
        <h2 className="text-4xl font-bold font-headline text-foreground tracking-tight">Arbogram</h2>
        <p className="text-muted-foreground max-w-sm">
          Выберите чат, чтобы начать общение.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
        <div className="p-4 rounded-2xl bg-white/40 border border-primary/10 text-left space-y-2">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">Б</span>
          </div>
          <p className="text-sm font-semibold">Быстро</p>
          <p className="text-[10px] text-muted-foreground">Мгновенная доставка сообщений.</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/40 border border-primary/10 text-left space-y-2">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-accent">Н</span>
          </div>
          <p className="text-sm font-semibold">Надежно</p>
          <p className="text-[10px] text-muted-foreground">Ваши данные под защитой.</p>
        </div>
      </div>
    </div>
  );
}
