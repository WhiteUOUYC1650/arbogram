
"use client";

import * as React from "react";
import { Search, Users, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function CreateChatDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("@");
  const [groupName, setGroupName] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<any>(null);
  
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Получаем данные текущего пользователя для записи в метаданные чата
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
        toast({ variant: "destructive", title: "Не найдено", description: "Пользователь с таким тегом не существует." });
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
      
      // Ищем, не создан ли уже такой чат (в идеале нужно искать query по participants)
      // Для MVP просто создаем.
      
      const chatData = {
        participants,
        metadata: {
          [user.uid]: {
            displayName: currentUserData.displayName || "Я",
            photoURL: currentUserData.photoURL || ""
          },
          [targetUser.uid]: {
            displayName: targetUser.displayName,
            photoURL: targetUser.photoURL || ""
          }
        },
        type: "individual",
        lastMessage: "Чат начат",
        lastMessageTime: Date.now(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "chats"), chatData);
      setOpen(false);
      router.push(`/chat/${docRef.id}`);
    } catch (e) {
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
      setOpen(false);
      router.push(`/chat/${docRef.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось создать группу." });
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
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="direct" className="rounded-lg">Личный чат</TabsTrigger>
            <TabsTrigger value="group" className="rounded-lg">Группа</TabsTrigger>
          </TabsList>
          
          <TabsContent value="direct" className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Введите @username..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching} className="rounded-xl bg-accent">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Найти"}
              </Button>
            </div>

            {foundUser && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-sidebar/20 border border-primary/10 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={foundUser.photoURL} />
                    <AvatarFallback>{foundUser.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{foundUser.displayName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{foundUser.username}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => startIndividualChat(foundUser)} 
                  disabled={isCreating}
                  className="rounded-lg bg-accent"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="group" className="space-y-4 py-4">
            <div className="space-y-2">
              <Input 
                placeholder="Название группы" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground px-1">
                Вы станете владельцем этой группы. Участников можно будет добавить позже.
              </p>
            </div>
            <Button 
              className="w-full rounded-xl bg-accent" 
              onClick={createGroup} 
              disabled={isCreating || !groupName.trim()}
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Создать группу"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
