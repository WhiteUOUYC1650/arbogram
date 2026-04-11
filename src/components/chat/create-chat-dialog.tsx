
"use client";

import * as React from "react";
import { Search, Send, Loader2, Megaphone, Globe, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface CreateChatDialogProps {
  children: React.ReactNode;
  onChatCreated?: (chatId: string) => void;
}

export function CreateChatDialog({ children, onChatCreated }: CreateChatDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("@");
  const [groupName, setGroupName] = React.useState("");
  const [channelName, setChannelName] = React.useState("");
  const [channelSlug, setChannelSlug] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<any>(null);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const currentUserRef = React.useMemo(() => (db && user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: currentUserData } = useDoc(currentUserRef);

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
          toast({ title: "Это вы!", description: "Нельзя начать чат с самим собой." });
        } else {
          setFoundUser({ ...u, id: snapshot.docs[0].id });
        }
      } else {
        toast({ variant: "destructive", title: "Не найдено", description: "Пользователь не существует." });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const startIndividualChat = async (targetUser: any) => {
    if (!db || !user || !currentUserData) return;
    setIsCreating(true);
    try {
      const participants = [user.uid, targetUser.uid].sort();
      const q = query(
        collection(db, "chats"), 
        where("type", "==", "individual"),
        where("participants", "==", participants)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        onChatCreated?.(existing.docs[0].id);
        setOpen(false);
        return;
      }
      const chatData = {
        participants,
        metadata: {
          [user.uid]: { displayName: currentUserData.displayName || "Я", photoURL: currentUserData.photoURL || "" },
          [targetUser.uid]: { displayName: targetUser.displayName, photoURL: targetUser.photoURL || "" }
        },
        type: "individual",
        lastMessage: "Чат начат",
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "chats"), chatData);
      onChatCreated?.(docRef.id);
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось создать чат." });
    } finally {
      setIsCreating(false);
    }
  };

  const createGroup = async () => {
    if (!db || !user || !groupName.trim()) return;
    setIsCreating(true);
    try {
      const groupAvatar = PlaceHolderImages.find(img => img.id === 'group-avatar')?.imageUrl || "";
      const chatData = {
        participants: [user.uid],
        ownerId: user.uid,
        type: "group",
        name: groupName,
        photoURL: groupAvatar,
        lastMessage: "Группа создана",
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "chats"), chatData);
      onChatCreated?.(docRef.id);
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось создать группу." });
    } finally {
      setIsCreating(false);
    }
  };

  const createChannel = async () => {
    if (!db || !user || !channelName.trim()) return;
    setIsCreating(true);
    try {
      const channelAvatar = PlaceHolderImages.find(img => img.id === 'chat-media-1')?.imageUrl || "";
      const chatData = {
        participants: [user.uid],
        ownerId: user.uid,
        type: "channel",
        name: channelName,
        slug: channelSlug || null,
        isPublic,
        photoURL: channelAvatar,
        lastMessage: "Канал создан",
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "chats"), chatData);
      onChatCreated?.(docRef.id);
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось создать канал." });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl">
        <DialogHeader><DialogTitle>Новый диалог</DialogTitle></DialogHeader>
        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl h-12">
            <TabsTrigger value="direct">Личный</TabsTrigger>
            <TabsTrigger value="group">Группа</TabsTrigger>
            <TabsTrigger value="channel">Канал</TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input placeholder="Введите @username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl" />
              </div>
              <Button onClick={handleSearch} disabled={isSearching} className="rounded-xl bg-accent">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Найти"}
              </Button>
            </div>
            {foundUser && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-sidebar/20 border border-primary/10">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10"><AvatarImage src={foundUser.photoURL} /><AvatarFallback>{foundUser.displayName[0]}</AvatarFallback></Avatar>
                  <div><p className="font-semibold text-sm">{foundUser.displayName}</p><p className="text-xs text-muted-foreground">{foundUser.username}</p></div>
                </div>
                <Button size="sm" onClick={() => startIndividualChat(foundUser)} disabled={isCreating} className="rounded-lg bg-accent text-white"><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="group" className="space-y-4 py-4">
            <Label>Название группы</Label>
            <Input placeholder="Название..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="rounded-xl" />
            <Button className="w-full rounded-xl bg-accent text-white" onClick={createGroup} disabled={isCreating || !groupName.trim()}>Создать</Button>
          </TabsContent>
          <TabsContent value="channel" className="space-y-4 py-4">
            <Label>Название канала</Label>
            <Input placeholder="Название..." value={channelName} onChange={(e) => setChannelName(e.target.value)} className="rounded-xl" />
            <div className="flex items-center justify-between p-3 bg-sidebar/10 rounded-2xl">
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /><span className="text-xs font-semibold">Публичный</span></div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <Button className="w-full rounded-xl bg-accent text-white" onClick={createChannel} disabled={isCreating || !channelName.trim()}>Создать канал</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
