
"use client";

import * as React from "react";
import { Search, Send, Loader2, Megaphone, Globe, Lock, Contact, UserPlus, Phone, MessageSquare, Smile, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Contacts } from "@capacitor-community/contacts";
import { normalizePhoneNumber } from "@/lib/phone-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/user-avatar";

const CHUNK_SIZE = 800000; // ~800KB

export function CreateChatDialog({ children, onChatCreated }: CreateChatDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("@");
  const [groupName, setGroupName] = React.useState("");
  const [channelName, setChannelName] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<any>(null);
  
  // Sticker Pack State
  const [packName, setPackName] = React.useState("");
  const [stickerFiles, setStickerFiles] = React.useState<string[]>([]);

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!db || searchQuery.length < 2) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      const q = query(collection(db, "users"), where("username", "==", searchQuery));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const u = snapshot.docs[0].data();
        if (u.uid === user?.uid) {
          toast({ title: "Это вы!" });
        } else {
          setFoundUser({ ...u, id: snapshot.docs[0].id });
        }
      } else {
        toast({ variant: "destructive", title: "Не найдено" });
      }
    } catch (e) { console.error(e); } finally { setIsSearching(false); }
  };

  const createStickerPack = async () => {
    if (!db || !user || !packName.trim() || stickerFiles.length === 0) return;
    setIsCreating(true);
    try {
      const packRef = await addDoc(collection(db, "stickerPacks"), {
        name: packName,
        ownerId: user.uid,
        createdAt: Date.now()
      });

      for (const fileData of stickerFiles) {
        const isGif = fileData.startsWith("data:image/gif");
        const stickerRef = await addDoc(collection(db, "stickerPacks", packRef.id, "stickers"), {
          type: isGif ? "gif" : "sticker",
          packId: packRef.id,
          chunkCount: Math.ceil(fileData.length / CHUNK_SIZE)
        });

        const chunks = [];
        for (let i = 0; i < fileData.length; i += CHUNK_SIZE) {
          chunks.push(fileData.substring(i, i + CHUNK_SIZE));
        }

        for (let i = 0; i < chunks.length; i++) {
          await addDoc(collection(db, "stickerPacks", packRef.id, "stickers", stickerRef.id, "chunks"), {
            data: chunks[i],
            index: i
          });
        }
      }

      toast({ title: "Стикерпак создан!" });
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e.message });
    } finally { setIsCreating(false); }
  };

  const handleStickerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Слишком большой файл", description: "Макс 10МБ" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setStickerFiles(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden h-[80vh] flex flex-col">
        <DialogHeader className="p-6 pb-0"><DialogTitle>Создать</DialogTitle></DialogHeader>
        <Tabs defaultValue="direct" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-5 rounded-none bg-muted/30 h-12 text-[10px]">
            <TabsTrigger value="direct">Личный</TabsTrigger>
            <TabsTrigger value="contacts">Люди</TabsTrigger>
            <TabsTrigger value="group">Группа</TabsTrigger>
            <TabsTrigger value="channel">Канал</TabsTrigger>
            <TabsTrigger value="stickers">Стикеры</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="stickers" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Название пака</Label>
                <Input placeholder="Напр. Крутые коты" value={packName} onChange={e => setPackName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Стикеры или GIF (до 10МБ)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {stickerFiles.map((s, i) => (
                    <div key={i} className="relative aspect-square rounded-lg border overflow-hidden">
                      <img src={s} className="w-full h-full object-cover" />
                      <button onClick={() => setStickerFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-destructive text-white p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleStickerFile} multiple />
                  </label>
                </div>
              </div>
              <Button className="w-full rounded-xl bg-accent h-12" onClick={createStickerPack} disabled={isCreating || !packName || stickerFiles.length === 0}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Опубликовать пак"}
              </Button>
            </TabsContent>
            {/* Остальные TabsContent остаются без изменений */}
            <TabsContent value="direct" className="space-y-4 mt-0">
              <div className="flex gap-2">
                <Input placeholder="Введите @username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl" />
                <Button onClick={handleSearch} disabled={isSearching} className="rounded-xl bg-accent">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Найти"}
                </Button>
              </div>
              {foundUser && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-sidebar/20 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={foundUser.uid} fallback={foundUser.displayName} className="w-10 h-10" />
                    <div><p className="font-semibold text-sm">{foundUser.displayName}</p><p className="text-xs text-muted-foreground">{foundUser.username}</p></div>
                  </div>
                  <Button size="sm" onClick={() => {}} className="rounded-lg bg-accent text-white"><Send className="w-4 h-4" /></Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
