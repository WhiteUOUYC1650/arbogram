"use client";

import * as React from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc } from "firebase/firestore";

/**
 * Основной интерфейс мессенджера (SPA).
 * CoveChat v1.1 "Redirection"
 */
export default function ChatPageClient() {
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const isMobile = useIsMobile();
  const db = useFirestore();
  const { user } = useUser();

  const handleStartDirectChat = async (targetUserId: string) => {
    if (!db || !user || targetUserId === user.uid) return;

    try {
      const participants = [user.uid, targetUserId].sort();
      const q = query(
        collection(db, "chats"),
        where("type", "==", "individual"),
        where("participants", "==", participants)
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        setActiveChatId(snap.docs[0].id);
        return;
      }

      // Получаем инфу о целевом пользователе
      const targetUserRef = doc(db, "users", targetUserId);
      const targetUserSnap = await getDocs(query(collection(db, "users"), where("uid", "==", targetUserId)));
      const targetUserData = targetUserSnap.docs[0]?.data();
      
      const currentUserRef = doc(db, "users", user.uid);
      const currentUserSnap = await getDocs(query(collection(db, "users"), where("uid", "==", user.uid)));
      const currentUserData = currentUserSnap.docs[0]?.data();

      if (!targetUserData || !currentUserData) return;

      const newChat = await addDoc(collection(db, "chats"), {
        participants,
        type: "individual",
        metadata: {
          [user.uid]: { displayName: currentUserData.displayName, photoURL: currentUserData.photoURL || "" },
          [targetUserId]: { displayName: targetUserData.displayName, photoURL: targetUserData.photoURL || "" }
        },
        lastMessage: "Чат начат",
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp()
      });

      setActiveChatId(newChat.id);
    } catch (e) {
      console.error("Start chat error:", e);
    }
  };

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
            onStartDirectChat={handleStartDirectChat}
          />
        ) : (
          <div className="hidden md:flex h-full flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-700">
            <ArbogramIcon className="w-32 h-32" />
            <div className="space-y-2">
              <h2 className="text-5xl font-bold font-headline text-foreground tracking-tighter">CoveChat</h2>
              <div className="flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-primary/30" />
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">Redirection v1.1</p>
                <span className="h-px w-8 bg-primary/30" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
