"use client";

import * as React from 'react';
import { Check, Copy, Hash, Link2, Loader2, Share2, ShieldCheck } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChannelSettingsDialogProps {
  chatId: string;
  chatData: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Настройки канала: описание, публичность, привязка группы для комментариев, ссылка. */
export function ChannelSettingsDialog({
  chatId,
  chatData,
  open,
  onOpenChange,
}: ChannelSettingsDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [name, setName] = React.useState(chatData?.name || '');
  const [description, setDescription] = React.useState(chatData?.description || '');
  const [linkedChatId, setLinkedChatId] = React.useState(chatData?.linkedChatId || '');
  const [isPublic, setIsPublic] = React.useState(Boolean(chatData?.isPublic));

  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const myChatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
  }, [db, user?.uid]);
  const { data: myChats } = useCollection(myChatsQuery);

  const groups = React.useMemo(
    () => (myChats || []).filter((chat: any) => chat.type === 'group'),
    [myChats],
  );

  const isOwner = Boolean(user && chatData?.ownerId === user.uid);
  const shareUrl =
    chatData?.slug && typeof window !== 'undefined'
      ? `${window.location.origin}/agc/${chatData.slug}/`
      : '';

  React.useEffect(() => {
    if (!open) return;
    setName(chatData?.name || '');
    setDescription(chatData?.description || '');
    setLinkedChatId(chatData?.linkedChatId || '');
    setIsPublic(Boolean(chatData?.isPublic));
  }, [open, chatData?.name, chatData?.description, chatData?.linkedChatId, chatData?.isPublic]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Ссылка скопирована', description: shareUrl });
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось скопировать ссылку' });
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: chatData?.name || 'SLink', url: shareUrl });
      } catch {
        // пользователь передумал
      }
    } else {
      handleCopy();
    }
  };

  const handleSave = async () => {
    if (!db || !isOwner) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        name: name.trim() || chatData?.name,
        description: description.trim(),
        linkedChatId: linkedChatId || null,
        isPublic,
      });
      toast({ title: 'Канал обновлён' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Ошибка', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[95vw] flex-col overflow-hidden rounded-[28px] border-none bg-surface-low p-0 shadow-m3-strong sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-outline-variant/60 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Hash className="h-5 w-5 text-primary" /> Настройки канала
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant">
            {chatData?.slug ? `slink/${chatData.slug}` : 'Канал SLink'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-3xl border border-outline-variant/60 p-4">
            <p className="m3-label mb-2">Ссылка на канал</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl || 'Ссылка появится после сохранения слага'} className="h-11 rounded-2xl border-none bg-surface-high font-mono text-xs" />
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-2xl" onClick={handleCopy} disabled={!shareUrl} aria-label="Скопировать ссылку">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-2xl" onClick={handleShare} disabled={!shareUrl} aria-label="Поделиться">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-on-surface-variant">
              Ссылку можно открыть в браузере или в приложении — канал подхватится автоматически.
            </p>
          </div>

          {isOwner ? (
            <>
              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Название</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="m3-field" />
              </div>

              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Описание</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="О чём канал?"
                  className="min-h-[88px] rounded-2xl border-none bg-surface-high text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="m3-label ml-1">Группа для комментариев</Label>
                <select
                  value={linkedChatId}
                  onChange={(e) => setLinkedChatId(e.target.value)}
                  className="h-12 w-full rounded-2xl border-none bg-surface-high px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Без обсуждения</option>
                  {groups.map((group: any) => (
                    <option key={group.id} value={group.id}>
                      {group.name || 'Группа'}
                    </option>
                  ))}
                </select>
                <p className="px-1 text-[11px] text-on-surface-variant">
                  В канале появится кнопка «Обсуждение», ведущая в эту группу.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-3xl bg-surface-high/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-secondary-on-container">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Публичный канал</p>
                    <p className="text-[11px] text-on-surface-variant">Открывается по ссылке</p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-surface-high/70 p-4 text-[11px] text-on-surface-variant">
              Менять настройки канала может только владелец.
            </div>
          )}
        </div>

        {isOwner && (
          <div className="shrink-0 border-t border-outline-variant/60 p-4">
            <Button
              className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="mr-2 h-4 w-4" /> Сохранить</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
