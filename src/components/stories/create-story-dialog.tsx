
"use client";

import * as React from "react";
import { Plus, Loader2, Image as ImageIcon, Type } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function CreateStoryDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [type, setType] = React.useState<"text" | "image">("text");
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!db || !user || !content.trim()) return;
    
    setIsCreating(true);
    try {
      // 1. Проверяем количество текущих историй пользователя
      const q = query(
        collection(db, "stories"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "asc")
      );
      const snapshot = await getDocs(q);
      
      // 2. Если историй 10 или больше, удаляем самую старую
      if (snapshot.size >= 10) {
        const oldestStory = snapshot.docs[0];
        await deleteDoc(doc(db, "stories", oldestStory.id));
      }

      let finalContent = content;
      if (type === 'image') {
        const randomImg = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
        finalContent = randomImg.imageUrl;
      }

      const storyData = {
        userId: user.uid,
        userName: user.displayName || "Пользователь",
        userPhoto: user.photoURL || "",
        content: finalContent,
        type,
        timestamp: Date.now()
      };

      await addDoc(collection(db, "stories"), storyData);
      setOpen(false);
      setContent("");
      toast({ title: "История опубликована!", description: "Ваши друзья увидят её в ленте." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Создать историю</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-center gap-4">
            <Button 
              variant={type === 'text' ? 'default' : 'outline'} 
              onClick={() => setType('text')}
              className="rounded-xl flex-1"
            >
              <Type className="w-4 h-4 mr-2" /> Текст
            </Button>
            <Button 
              variant={type === 'image' ? 'default' : 'outline'} 
              onClick={() => setType('image')}
              className="rounded-xl flex-1"
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Фото
            </Button>
          </div>
          
          <Textarea 
            placeholder={type === 'text' ? "О чем вы думаете?" : "Подпись к фото (оно будет случайным)..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rounded-2xl min-h-[120px]"
          />

          <Button 
            className="w-full rounded-xl bg-accent h-12" 
            onClick={handleCreate} 
            disabled={isCreating || !content.trim()}
          >
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Опубликовать"}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">Максимум 10 историй. При добавлении новой старые удаляются.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
