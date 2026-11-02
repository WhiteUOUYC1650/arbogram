
"use client";

import * as React from "react";
import { Plus, Loader2, Image as ImageIcon, Type, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFirestore, useUser } from "@/firebase";
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function CreateStoryDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [type, setType] = React.useState<"text" | "image">("text");
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file);
      setSelectedImage(base64);
    } catch (err) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось обработать фото." });
    }
  };

  const handleCreate = async () => {
    if (!db || !user) return;
    if (type === 'text' && !content.trim()) return;
    if (type === 'image' && !selectedImage) return;
    
    setIsCreating(true);
    try {
      // Этот запрос может потребовать индекс
      const q = query(
        collection(db, "stories"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "asc")
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.size >= 10) {
        const oldestStory = snapshot.docs[0];
        await deleteDoc(doc(db, "stories", oldestStory.id));
      }

      const storyData = {
        userId: user.uid,
        userName: user.displayName || "Пользователь",
        userPhoto: user.photoURL || "",
        content: type === 'image' ? selectedImage : content,
        type,
        timestamp: Date.now()
      };

      await addDoc(collection(db, "stories"), storyData);
      setOpen(false);
      resetState();
      toast({ title: "История опубликована!", description: "Ваши друзья увидят её в ленте." });
    } catch (e: any) {
      console.error("Story creation error:", e);
      // Прокидываем ошибку в слушатель, чтобы увидеть ссылку в консоли
      const permissionError = new FirestorePermissionError({
        path: "stories",
        operation: "create"
      });
      (permissionError as any).originalError = e;
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsCreating(false);
    }
  };

  const resetState = () => {
    setContent("");
    setSelectedImage(null);
    setType("text");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetState(); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[95vw] rounded-[28px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Создать историю</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-high p-1">
            <Button 
              variant="ghost"
              onClick={() => setType('text')}
              className={
                type === 'text'
                  ? 'rounded-full bg-surface-lowest text-primary shadow-sm hover:bg-surface-lowest'
                  : 'rounded-full text-on-surface-variant'
              }
            >
              <Type className="mr-2 h-4 w-4" /> Текст
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setType('image')}
              className={
                type === 'image'
                  ? 'rounded-full bg-surface-lowest text-primary shadow-sm hover:bg-surface-lowest'
                  : 'rounded-full text-on-surface-variant'
              }
            >
              <ImageIcon className="mr-2 h-4 w-4" /> Фото
            </Button>
          </div>
          
          {type === 'text' ? (
            <Textarea 
              placeholder="О чем вы думаете?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] rounded-2xl border-none bg-surface-high text-[15px]"
            />
          ) : (
            <div className="space-y-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
              {!selectedImage ? (
                <div 
                  className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant transition-colors hover:bg-on-surface/5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Нажмите, чтобы выбрать фото</p>
                </div>
              ) : (
                <div className="relative mx-auto aspect-[9/16] max-h-[300px] overflow-hidden rounded-2xl border border-outline-variant/60">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 rounded-full w-8 h-8"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button 
            className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground shadow-m3" 
            onClick={handleCreate} 
            disabled={isCreating || (type === 'text' && !content.trim()) || (type === 'image' && !selectedImage)}
          >
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Опубликовать"}
          </Button>
          <p className="text-center text-[11px] text-on-surface-variant">Максимум 10 историй. При добавлении новой старые удаляются.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
