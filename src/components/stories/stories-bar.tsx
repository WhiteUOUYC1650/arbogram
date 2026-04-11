
"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where } from "firebase/firestore";
import { CreateStoryDialog } from "./create-story-dialog";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "@/components/ui/dialog";

export function StoriesBar() {
  const db = useFirestore();

  const storiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return query(
      collection(db, "stories"),
      where("timestamp", ">", oneDayAgo),
      orderBy("timestamp", "desc")
    );
  }, [db]);

  const { data: stories } = useCollection(storiesQuery);

  // Группируем истории по пользователям для отображения кружков
  const userStories = React.useMemo(() => {
    if (!stories) return [];
    const groups: Record<string, any> = {};
    stories.forEach(s => {
      if (!groups[s.userId]) {
        groups[s.userId] = {
          userId: s.userId,
          userName: s.userName,
          userPhoto: s.userPhoto,
          lastStory: s
        };
      }
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

          {userStories.map((user) => (
            <StoryViewer key={user.userId} user={user} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function StoryViewer({ user }: { user: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-14 h-14 rounded-full p-0.5 border-2 border-accent transition-transform hover:scale-105 active:scale-95">
            <Avatar className="w-full h-full border-2 border-white">
              <AvatarImage src={user.userPhoto} />
              <AvatarFallback>{user.userName[0]}</AvatarFallback>
            </Avatar>
          </div>
          <span className="text-[10px] font-medium truncate max-w-[60px]">{user.userName}</span>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black rounded-3xl border-none h-[80vh] flex flex-col items-center justify-center">
        <DialogHeader className="sr-only">
          <DialogTitle>История от {user.userName}</DialogTitle>
        </DialogHeader>
        
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <Avatar className="w-8 h-8 border border-white/20">
            <AvatarImage src={user.userPhoto} />
            <AvatarFallback>{user.userName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-white text-sm font-semibold shadow-black drop-shadow-md">
            {user.userName}
          </span>
        </div>
        
        {user.lastStory.type === 'image' ? (
          <img 
            src={user.lastStory.content} 
            alt="Story" 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-accent/40 to-primary/40 text-center">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg leading-relaxed">
              {user.lastStory.content}
            </h2>
          </div>
        )}

        <div className="absolute bottom-6 left-0 right-0 text-center">
          <span className="text-white/60 text-[10px]">
            {new Date(user.lastStory.timestamp).toLocaleString('ru-RU', { 
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            })}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
