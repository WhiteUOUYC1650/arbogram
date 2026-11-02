"use client";

import * as React from 'react';
import { Plus, X, Trash2, MessageSquare } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { CreateStoryDialog } from './create-story-dialog';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserProfileDialog } from '../chat/user-profile-dialog';

export function StoriesBar({ onStartChat }: { onStartChat?: (id: string) => void }) {
  const db = useFirestore();

  const storiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return query(collection(db, 'stories'), where('timestamp', '>', oneDayAgo), orderBy('timestamp', 'desc'));
  }, [db]);

  const { data: stories } = useCollection(storiesQuery);

  const userGroups = React.useMemo(() => {
    if (!stories) return [];
    const groups: Record<string, any> = {};
    [...stories].sort((a, b) => a.timestamp - b.timestamp).forEach((s) => {
      if (!groups[s.userId]) {
        groups[s.userId] = { userId: s.userId, userName: s.userName, stories: [] };
      }
      groups[s.userId].stories.push(s);
    });
    return Object.values(groups);
  }, [stories]);

  return (
    <div className="shrink-0 border-b border-outline-variant/50 bg-surface-low">
      <div className="no-scrollbar flex w-full gap-4 overflow-x-auto px-4 py-3">
        <CreateStoryDialog>
          <button type="button" className="group flex shrink-0 flex-col items-center gap-1.5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-outline bg-surface-high text-primary transition-colors group-hover:bg-surface-highest">
              <Plus className="h-6 w-6" />
            </span>
            <span className="max-w-[64px] truncate text-[11px] font-medium text-on-surface-variant">
              Моя
            </span>
          </button>
        </CreateStoryDialog>

        {userGroups.map((group: any) => (
          <StoryViewer key={group.userId} group={group} onStartChat={onStartChat} />
        ))}
      </div>
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setCurrentIndex(0);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="group flex shrink-0 flex-col items-center gap-1.5">
          <span className="slink-gradient flex h-14 w-14 items-center justify-center rounded-full p-[2px] transition-transform group-hover:scale-105 group-active:scale-95">
            <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-low p-[2px]">
              <UserAvatar userId={group.userId} fallback={group.userName} className="h-full w-full" />
            </span>
          </span>
          <span className="max-w-[64px] truncate text-[11px] font-medium text-on-surface-variant">
            {group.userName}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="flex h-[85vh] w-[95vw] flex-col items-center justify-center overflow-hidden rounded-[28px] border-none bg-black p-0 sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>История {group.userName}</DialogTitle>
        </DialogHeader>

        <div className="absolute left-4 right-4 top-5 z-40 flex items-center justify-between">
          <UserProfileDialog
            userId={group.userId}
            onStartChat={(id) => {
              setIsOpen(false);
              onStartChat?.(id);
            }}
          >
            <div className="flex cursor-pointer items-center gap-2">
              <UserAvatar userId={group.userId} fallback={group.userName} className="h-9 w-9" />
              <div className="flex flex-col text-xs font-semibold text-white">
                <span>{group.userName}</span>
                <span className="text-[9px] opacity-60">
                  {new Date(currentStory.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {!isOwner && <MessageSquare className="ml-2 h-4 w-4 text-white/70" />}
            </div>
          </UserProfileDialog>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white hover:bg-destructive"
                onClick={async (e) => {
                  e.stopPropagation();
                  await deleteDoc(doc(db!, 'stories', currentStory.id));
                  toast({ title: 'Удалено' });
                  if (group.stories.length === 1) setIsOpen(false);
                  else setCurrentIndex(Math.max(0, currentIndex - 1));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-white">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="absolute inset-0 flex">
          <div
            className="h-full w-1/2 cursor-west-resize"
            onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
          />
          <div
            className="h-full w-1/2 cursor-east-resize"
            onClick={() => currentIndex < group.stories.length - 1 && setCurrentIndex(currentIndex + 1)}
          />
        </div>

        {currentStory.type === 'image' ? (
          <img src={currentStory.content} className="h-full w-full object-contain" alt="Story" />
        ) : (
          <div className="slink-gradient flex h-full w-full items-center justify-center p-8 text-center">
            <h2 className="whitespace-pre-wrap text-2xl font-bold text-white">{currentStory.content}</h2>
          </div>
        )}

        {group.stories.length > 1 && (
          <div className="absolute bottom-5 left-4 right-4 z-40 flex gap-1.5">
            {group.stories.map((_: any, i: number) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
