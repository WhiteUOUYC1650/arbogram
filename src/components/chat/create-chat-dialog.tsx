
"use client";

import * as React from "react";
import { Search, Send, Loader2, Megaphone, Globe, Lock, Contact, UserPlus, Phone, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState(false);

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

  const syncContacts = async () => {
    if (!db) return;
    setIsSyncing(true);
    try {
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== 'granted') {
        toast({ variant: "destructive", title: "Доступ запрещен", description: "Разрешите доступ к контактам в настройках." });
        return;
      }
      setHasPermission(true);

      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
        },
      });

      const matchedUsers: any[] = [];
      const phoneNumbers = result.contacts
        .flatMap(c => c.phones || [])
        .map(p => normalizePhoneNumber(p.number || ""))
        .filter(p => p.length > 5);

      if (phoneNumbers.length > 0) {
        // Firebase `in` operator limited to 10 elements, so we batch or just do multiple queries
        // For simplicity in MVP, we take first 10 for now or do individual checks if list is small
        // In a real app, you'd use a cloud function or batching.
        const chunks = [];
        for (let i = 0; i < phoneNumbers.length; i += 10) {
          chunks.push(phoneNumbers.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const q = query(collection(db, "users"), where("phoneNumber", "in", chunk));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const data = doc.data();
            if (data.uid !== user?.uid) matchedUsers.push(data);
          });
        }
      }

      setContacts(matchedUsers);
      if (matchedUsers.length === 0) {
        toast({ title: "Контакты синхронизированы", description: "Никто из ваших контактов еще не пользуется CoveChat." });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось синхронизировать контакты." });
    } finally {
      setIsSyncing(false);
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
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden h-[80vh] flex flex-col">
        <DialogHeader className="p-6 pb-0"><DialogTitle>Новый диалог</DialogTitle></DialogHeader>
        <Tabs defaultValue="direct" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 rounded-none bg-muted/30 h-12">
            <TabsTrigger value="direct">Личный</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
            <TabsTrigger value="group">Группа</TabsTrigger>
            <TabsTrigger value="channel">Канал</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="direct" className="space-y-4 mt-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input placeholder="Введите @username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-xl" />
                </div>
                <Button onClick={handleSearch} disabled={isSearching} className="rounded-xl bg-accent">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Найти"}
                </Button>
              </div>
              {foundUser && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-sidebar/20 border border-primary/10 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <UserAvatar userId={foundUser.uid} fallback={foundUser.displayName} className="w-10 h-10" />
                    <div><p className="font-semibold text-sm">{foundUser.displayName}</p><p className="text-xs text-muted-foreground">{foundUser.username}</p></div>
                  </div>
                  <Button size="sm" onClick={() => startIndividualChat(foundUser)} disabled={isCreating} className="rounded-lg bg-accent text-white"><Send className="w-4 h-4" /></Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4 mt-0 h-full flex flex-col">
              {!hasPermission ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 text-primary"><Contact className="w-10 h-10" /></div>
                  <div className="space-y-1">
                    <h3 className="font-bold">Чат с контактами</h3>
                    <p className="text-xs text-muted-foreground">Синхронизируйте свои контакты, чтобы увидеть, кто уже в CoveChat.</p>
                  </div>
                  <Button onClick={syncContacts} disabled={isSyncing} className="rounded-xl bg-primary gap-2">
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Разрешить доступ
                  </Button>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Контакты в мессенджере</p>
                      <Button variant="ghost" size="sm" onClick={syncContacts} className="h-7 text-[10px] text-primary" disabled={isSyncing}>Обновить</Button>
                    </div>
                    {contacts.length > 0 ? contacts.map(c => (
                      <div key={c.uid} onClick={() => startIndividualChat(c)} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 cursor-pointer border border-transparent transition-colors">
                        <div className="flex items-center gap-3">
                          <UserAvatar userId={c.uid} fallback={c.displayName} className="w-10 h-10" />
                          <div>
                            <p className="font-semibold text-sm">{c.displayName}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{c.phoneNumber}</p>
                          </div>
                        </div>
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                    )) : (
                      <p className="text-center text-xs text-muted-foreground py-8">Пока никого нет</p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="group" className="space-y-4 mt-0">
              <Label>Название группы</Label>
              <Input placeholder="Название..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="rounded-xl" />
              <Button className="w-full rounded-xl bg-accent text-white" onClick={createGroup} disabled={isCreating || !groupName.trim()}>Создать</Button>
            </TabsContent>

            <TabsContent value="channel" className="space-y-4 mt-0">
              <Label>Название канала</Label>
              <Input placeholder="Название..." value={channelName} onChange={(e) => setChannelName(e.target.value)} className="rounded-xl" />
              <div className="flex items-center justify-between p-3 bg-sidebar/10 rounded-2xl">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /><span className="text-xs font-semibold">Публичный</span></div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <Button className="w-full rounded-xl bg-accent text-white" onClick={createChannel} disabled={isCreating || !channelName.trim()}>Создать канал</Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
