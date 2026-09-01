
"use client";

import * as React from "react";
import { 
  Send, Paperclip, X, Loader2, 
  MoreVertical, Trash2, Copy, 
  Reply, Smile, ShieldBan, LogOut, CheckCheck, Download, Globe, Image as ImageIcon, Mic, StopCircle, BarChart2, StickyNote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { 
  collection, query, orderBy, addDoc, doc, updateDoc, 
  deleteDoc, arrayUnion, arrayRemove, getDoc, getDocs, where, limit 
} from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { translations, Language } from "@/lib/i18n";
import { UserProfileDialog } from "./user-profile-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GLOBAL_CHAT_ID = "p7gSC3o9OxVezsjDbrFq";

export function ChatWindow({ chatId, onBack, onStartDirectChat }: ChatWindowProps) {
  const [message, setMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [lang, setLang] = React.useState<Language>('ru');
  const [replyTo, setReplyTo] = React.useState<any>(null);
  const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = React.useState(false);
  
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  React.useEffect(() => {
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
  }, []);

  const t = translations[lang];
  const chatRef = useMemoFirebase(() => db ? doc(db, "chats", chatId) : null, [db, chatId]);
  const { data: chatData } = useDoc(chatRef);
  
  const messagesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
  }, [db, chatId]);
  const { data: rawMessages } = useCollection(messagesQuery);

  const handleSend = async (options: { audioUrl?: string; duration?: number; poll?: any; sticker?: { id: string; packId: string } } = {}) => {
    const { audioUrl, duration, poll, sticker } = options;
    if (!message.trim() && selectedImages.length === 0 && !audioUrl && !poll && !sticker) return;
    if (!db || !user) return;

    setIsSending(true);
    const msgData: any = {
      senderId: user.uid,
      senderName: user.displayName || "User",
      timestamp: Date.now(),
      type: sticker ? "sticker" : (poll ? "poll" : (audioUrl ? "audio" : (selectedImages.length > 0 ? "image" : "text"))),
      text: message.trim() || null,
      imageUrls: selectedImages.length > 0 ? selectedImages : null,
      audioUrl: audioUrl || null,
      poll: poll || null,
      stickerId: sticker?.id || null,
      packId: sticker?.packId || null,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || 'Вложение', senderName: replyTo.senderName } : null
    };

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), msgData);
      let last = msgData.text || "Вложение";
      if (sticker) last = "🎨 Стикер";
      await updateDoc(chatRef!, { lastMessage: last, lastMessageTime: Date.now() });
      setMessage(""); setSelectedImages([]); setReplyTo(null); setStickerPickerOpen(false);
    } catch (e) { toast({ title: "Ошибка отправки" }); } finally { setIsSending(false); }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-black/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && <Button variant="ghost" size="icon" onClick={onBack}><X className="w-5 h-5" /></Button>}
          <h2 className="font-bold text-sm">{chatData?.name || "Чат"}</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-4">
          {rawMessages?.map((msg: any) => (
            <div key={msg.id} className={cn("flex flex-col max-w-[80%]", msg.senderId === user?.uid ? "ml-auto items-end" : "items-start")}>
              <div className={cn("p-3 rounded-2xl text-sm", msg.senderId === user?.uid ? "cove-gradient text-white" : "bg-white dark:bg-zinc-800 border")}>
                {msg.type === 'sticker' && <StickerRenderer packId={msg.packId} stickerId={msg.stickerId} />}
                {msg.text && <p>{msg.text}</p>}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {stickerPickerOpen && <StickerPicker onSelect={(s) => handleSend({ sticker: s })} />}

      <div className="p-4 border-t flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setStickerPickerOpen(!stickerPickerOpen)}><Smile className="w-5 h-5" /></Button>
        <Input placeholder={t.message} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <Button className="cove-gradient text-white" onClick={() => handleSend()} disabled={isSending}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function StickerPicker({ onSelect }: { onSelect: (s: { id: string; packId: string }) => void }) {
  const db = useFirestore();
  const packsQuery = query(collection(db!, "stickerPacks"), orderBy("createdAt", "desc"), limit(20));
  const { data: packs } = useCollection(packsQuery);
  const [activePackId, setActivePackId] = React.useState<string | null>(null);

  return (
    <div className="h-64 border-t bg-muted/20 animate-in slide-in-from-bottom flex flex-col">
      <Tabs defaultValue={packs?.[0]?.id || "none"} className="flex-1 flex flex-col overflow-hidden" onValueChange={setActivePackId}>
        <TabsList className="h-10 bg-transparent px-4 gap-2 overflow-x-auto justify-start">
          {packs?.map(p => (
            <TabsTrigger key={p.id} value={p.id} className="text-xs">{p.name}</TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1 overflow-y-auto p-4">
          {packs?.map(p => (
            <TabsContent key={p.id} value={p.id} className="grid grid-cols-4 gap-2 mt-0">
              <StickerList packId={p.id} onSelect={onSelect} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

function StickerList({ packId, onSelect }: { packId: string, onSelect: any }) {
  const db = useFirestore();
  const stickersQuery = query(collection(db!, "stickerPacks", packId, "stickers"));
  const { data: stickers } = useCollection(stickersQuery);
  return <>{stickers?.map(s => <div key={s.id} onClick={() => onSelect({ id: s.id, packId })} className="cursor-pointer hover:bg-muted p-1 rounded-lg"><StickerRenderer packId={packId} stickerId={s.id} /></div>)}</>;
}

function StickerRenderer({ packId, stickerId }: { packId: string, stickerId: string }) {
  const db = useFirestore();
  const chunksQuery = query(collection(db!, "stickerPacks", packId, "stickers", stickerId, "chunks"), orderBy("index", "asc"));
  const { data: chunks } = useCollection(chunksQuery);
  const fullData = React.useMemo(() => chunks?.map(c => c.data).join("") || null, [chunks]);

  if (!fullData) return <div className="w-16 h-16 bg-muted animate-pulse rounded-lg" />;
  return <img src={fullData} className="w-24 h-24 object-contain" alt="Sticker" />;
}
