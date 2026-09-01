"use client";

import * as React from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArbogramIcon } from "@/components/arbogram-icon";
import { cn } from "@/lib/utils";
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function ChatPageClient() {
  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const isMobile = useIsMobile();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

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

      const [userSnap, targetSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, "users", targetUserId))
      ]);

      if (!userSnap.exists() || !targetSnap.exists()) {
        toast({ variant: "destructive", title: "Ошибка", description: "Пользователь не найден." });
        return;
      }

      const userData = userSnap.data();
      const targetData = targetSnap.data();

      const newChat = await addDoc(collection(db, "chats"), {
        participants,
        type: "individual",
        metadata: {
          [user.uid]: { displayName: userData.displayName, photoURL: userData.photoURL || "" },
          [targetUserId]: { displayName: targetData.displayName, photoURL: targetData.photoURL || "" }
        },
        lastMessage: "Чат начат",
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp()
      });

      setActiveChatId(newChat.id);
    } catch (e) {
      console.error("Start chat error:", e);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось создать чат." });
    }
  };

  const showSidebar = !isMobile || !activeChatId;
  const showChat = activeChatId || !isMobile;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {showSidebar && (
        <div className={cn(
          "w-full md:w-80 flex-shrink-0 border-r bg-sidebar/50 backdrop-blur-sm transition-all duration-300",
        )}>
          <ChatSidebar 
            activeChatId={activeChatId || undefined} 
            onChatSelect={(id) => setActiveChatId(id)} 
          />
        </div>
      )}

      {showChat && (
        <main className={cn(
          "flex-1 relative h-full overflow-hidden transition-all duration-300",
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
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">Redirection v1.1.2</p>
                  <span className="h-px w-8 bg-primary/30" />
                </div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
