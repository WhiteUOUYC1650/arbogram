
"use client";

import * as React from "react";
import { Plus, X, Trash2, Loader2, User as UserIcon, MessageSquare } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, deleteDoc, doc, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { CreateStoryDialog } from "./create-story-dialog";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogClose } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function StoriesBar({ onStartChat }: { onStartChat?: (id: string) => void }) {
  const db = useFirestore();

  const storiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return query(collection(db, "stories"), where("timestamp", ">", oneDayAgo), orderBy("timestamp", "desc"));
  }, [db]);

  const { data: stories } = useCollection(storiesQuery);

  const userGroups = React.useMemo(() => {
    if (!stories) return [];
    const groups: Record<string, any> = {};
    [...stories].sort((a, b) => a.timestamp - b.timestamp).forEach(s => {
      if (!groups[s.userId]) {
        groups[s.userId] = { userId: s.userId, userName: s.userName, stories: [] };
      }
      groups[s.userId].stories.push(s);
    });
    return Object.values(groups);
  }, [stories]);

  return (
    <div className="py-2 border-b bg-sidebar/20">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-4 p-4">
          <CreateStoryDialog>
            <div className="flex flex-col items-center gap-1 cursor-pointer group">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-accent flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">Моя</span>
            </div>
          </CreateStoryDialog>
          {userGroups.map((group: any) => (
            <StoryViewer key={group.userId} group={group} onStartChat={onStartChat} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function StoryViewer({ group, onStartChat }: { group: any; onStartChat?: (id: string) => void }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const currentStory = group.stories[currentIndex];
  const isOwner = user?.uid === group.userId;

  const handleGoToProfile = async () => {
    if (!db || !user || isOwner) return;
    try {
      const participants = [user.uid, group.userId].sort();
      const q = query(collection(db, "chats"), where("type", "==", "individual"), where("participants", "==", participants));
      const snap = await getDocs(q);
      
      let chatId;
      if (!snap.empty) {
        chatId = snap.docs[0].id;
      } else {
        const newChat = await addDoc(collection(db, "chats"), {
          participants,
          type: "individual",
          metadata: {
            [user.uid]: { displayName: user.displayName || "Я", photoURL: user.photoURL || "" },
            [group.userId]: { displayName: group.userName, photoURL: "" }
          },
          lastMessage: "Чат начат из истории",
          lastMessageTime: Date.now(),
          createdAt: serverTimestamp()
        });
        chatId = newChat.id;
      }
      onStartChat?.(chatId);
      setIsOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось открыть профиль" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) setCurrentIndex(0); }}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-14 h-14 rounded-full p-0.5 border-2 border-accent transition-transform hover:scale-105 active:scale-95">
            <UserAvatar userId={group.userId} fallback={group.userName} className="w-full h-full border-2 border-white" />
          </div>
          <span className="text-[10px] font-medium truncate max-w-[60px]">{group.userName}</span>
        </div>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden bg-black rounded-3xl border-none h-[85vh] flex flex-col items-center justify-center">
        <DialogHeader className="sr-only"><DialogTitle>Story by {group.userName}</DialogTitle></DialogHeader>
        
        <div className="absolute top-6 left-4 right-4 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleGoToProfile}>
            <UserAvatar userId={group.userId} fallback={group.userName} className="w-8 h-8" />
            <div className="flex flex-col text-white text-xs font-semibold">
              <span>{group.userName}</span>
              <span className="opacity-60 text-[8px]">{new Date(currentStory.timestamp).toLocaleTimeString()}</span>
            </div>
            {!isOwner && <MessageSquare className="w-4 h-4 text-white/70 ml-2" />}
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button variant="ghost" size="icon" className="text-white hover:bg-destructive rounded-full" onClick={async (e) => {
                e.stopPropagation();
                await deleteDoc(doc(db!, "stories", currentStory.id));
                toast({ title: "Удалено" });
                if (group.stories.length === 1) setIsOpen(false);
                else setCurrentIndex(Math.max(0, currentIndex - 1));
              }}><Trash2 className="w-4 h-4" /></Button>
            )}
            <DialogClose asChild><Button variant="ghost" size="icon" className="text-white rounded-full"><X className="w-5 h-5" /></Button></DialogClose>
          </div>
        </div>

        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full cursor-west-resize" onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)} />
          <div className="w-1/2 h-full cursor-east-resize" onClick={() => currentIndex < group.stories.length - 1 && setCurrentIndex(currentIndex + 1)} />
        </div>
        
        {currentStory.type === 'image' ? (
          <img src={currentStory.content} className="w-full h-full object-contain" alt="Story" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-accent/40 to-primary/40 text-center">
            <h2 className="text-2xl font-bold text-white whitespace-pre-wrap">{currentStory.content}</h2>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
