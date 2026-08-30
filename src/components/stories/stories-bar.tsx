"use client";

import * as React from "react";
import { Plus, ChevronLeft, ChevronRight, X, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, where, deleteDoc, doc } from "firebase/firestore";
import { CreateStoryDialog } from "./create-story-dialog";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogClose } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  const userGroups = React.useMemo(() => {
    if (!stories) return [];
    const groups: Record<string, any> = {};
    const sortedStories = [...stories].sort((a, b) => a.timestamp - b.timestamp);

    sortedStories.forEach(s => {
      if (!groups[s.userId]) {
        groups[s.userId] = {
          userId: s.userId,
          userName: s.userName,
          userPhoto: s.userPhoto,
          stories: []
        };
      }
      groups[s.userId].stories.push(s);
    });
    
    return Object.values(groups).sort((a: any, b: any) => {
      const lastA = a.stories[a.stories.length - 1].timestamp;
      const lastB = b.stories[b.stories.length - 1].timestamp;
      return lastB - lastA;
    });
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
            <StoryViewer key={group.userId} group={group} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

function StoryViewer({ group }: { group: any }) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const currentStory = group.stories[currentIndex];
  const isOwner = user?.uid === group.userId;

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!db || !currentStory.id || !isOwner) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "stories", currentStory.id));
      toast({ title: "Удалено", description: "История была удалена." });
      
      if (group.stories.length === 1) {
        // Если была одна история, просто закрываем (произойдет при рендере списка)
      } else if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        // Если это была первая история и есть другие
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось удалить историю." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && setCurrentIndex(0)}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className={cn(
            "w-14 h-14 rounded-full p-0.5 border-2 border-accent transition-transform hover:scale-105 active:scale-95",
            group.stories.length > 1 && "ring-2 ring-accent/20 ring-offset-2"
          )}>
            <UserAvatar 
              userId={group.userId} 
              fallback={group.userName} 
              className="w-full h-full border-2 border-white" 
            />
          </div>
          <span className="text-[10px] font-medium truncate max-w-[60px]">{group.userName}</span>
        </div>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden bg-black rounded-3xl border-none h-[85vh] flex flex-col items-center justify-center select-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Истории от {group.userName}</DialogTitle>
        </DialogHeader>
        
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 z-30 flex gap-1">
          {group.stories.map((_: any, idx: number) => (
            <div 
              key={idx} 
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                idx === currentIndex ? "bg-white" : idx < currentIndex ? "bg-white/60" : "bg-white/20"
              )}
            />
          ))}
        </div>

        {/* User Info Bar */}
        <div className="absolute top-6 left-4 right-4 z-40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserAvatar 
              userId={group.userId} 
              fallback={group.userName} 
              className="w-8 h-8 border border-white/20" 
            />
            <div className="flex flex-col">
              <span className="text-white text-sm font-semibold shadow-black drop-shadow-md">
                {group.userName}
              </span>
              <span className="text-white/60 text-[8px]">
                {new Date(currentStory.timestamp).toLocaleString('ru-RU', { 
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                })}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full w-8 h-8 bg-black/20 text-white hover:bg-destructive transition-colors"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
            <DialogClose asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full w-8 h-8 bg-black/20 text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Navigation Layers */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/2 h-full cursor-west-resize" onClick={handlePrev} />
          <div className="w-1/2 h-full cursor-east-resize" onClick={handleNext} />
        </div>
        
        {currentStory.type === 'image' ? (
          <img 
            src={currentStory.content} 
            alt="Story" 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-accent/40 to-primary/40 text-center">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg leading-relaxed whitespace-pre-wrap">
              {currentStory.content}
            </h2>
          </div>
        )}

        {/* Footer info */}
        <div className="absolute bottom-6 left-0 right-0 text-center z-20">
           <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">
             {currentIndex + 1} / {group.stories.length}
           </span>
        </div>

        {/* Desktop Navigation Buttons */}
        {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 hidden sm:block"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < group.stories.length - 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 hidden sm:block"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}