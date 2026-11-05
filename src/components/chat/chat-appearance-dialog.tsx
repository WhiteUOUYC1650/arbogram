"use client";

import * as React from 'react';
import { Check, Loader2, Palette as PaletteIcon, RotateCcw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ACCENT_PALETTES,
  DEFAULT_CHAT_APPEARANCE,
  NAME_COLORS,
  WALLPAPERS,
  type ChatAppearance,
} from '@/lib/palettes';
import { useUserPrefs } from '@/lib/user-prefs';
import { cn } from '@/lib/utils';

interface ChatAppearanceDialogProps {
  chatId: string;
  chatTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Настройка внешнего вида конкретного чата: обои, палитра пузырей, цвет имени. */
export function ChatAppearanceDialog({
  chatId,
  chatTitle,
  open,
  onOpenChange,
}: ChatAppearanceDialogProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const { prefs, setChatAppearance } = useUserPrefs();
  const { toast } = useToast();

  const saved = prefs.chatSettings[chatId] ?? DEFAULT_CHAT_APPEARANCE;
  const [draft, setDraft] = React.useState<ChatAppearance>(saved);

  React.useEffect(() => {
    if (open) setDraft(saved);
  }, [open, saved.palette, saved.wallpaper, saved.nameColor, saved]);

  const wallpaper = WALLPAPERS.find((item) => item.id === draft.wallpaper) ?? WALLPAPERS[0];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setChatAppearance(chatId, draft);
      toast({ title: 'Оформление чата сохранено' });
      onOpenChange(false);
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось сохранить оформление' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[95vw] flex-col overflow-hidden rounded-[28px] border-none bg-surface-low p-0 shadow-m3-strong sm:max-w-md">
        <DialogHeader className="space-y-1 border-b border-outline-variant/60 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <PaletteIcon className="h-5 w-5 text-primary" /> Оформление чата
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant">
            {chatTitle ? `Только для «${chatTitle}»` : 'Только для этого чата'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Живой превью */}
          <div
            className={cn(
              'space-y-2 rounded-3xl border border-outline-variant/60 bg-background p-3',
              `chat-theme-${draft.palette}`,
              `name-color-${draft.nameColor}`,
              wallpaper.className,
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[hsl(var(--chat-name))]">Имя</span>
              <span className="rounded-full bg-surface-high px-2 py-0.5 text-[9px] uppercase tracking-wider text-on-surface-variant">
                превью
              </span>
            </div>
            <div className="flex justify-start">
              <p className="max-w-[80%] rounded-[18px] rounded-bl-md bg-surface-high px-3 py-1.5 text-xs text-on-surface">
                Привет! Как тебе новый стиль?
              </p>
            </div>
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-[18px] rounded-br-md bg-[hsl(var(--chat-out))] px-3 py-1.5 text-xs text-[hsl(var(--chat-out-text))]">
                Огонь 🔥
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="m3-label px-1">Обои</p>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, wallpaper: item.id }))}
                  className={cn(
                    'overflow-hidden rounded-2xl border-2 transition-all',
                    draft.wallpaper === item.id ? 'border-primary' : 'border-outline-variant/60',
                  )}
                >
                  <span
                    className={cn(
                      'block h-12 w-full bg-background',
                      `chat-theme-${draft.palette}`,
                      item.className,
                    )}
                  />
                  <span className="block px-1 py-1.5 text-[10px] font-semibold text-on-surface-variant">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="m3-label px-1">Цветовая тема чата</p>
            <div className="grid grid-cols-3 gap-2">
              {ACCENT_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, palette: palette.id }))}
                  className={cn(
                    'flex items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-left transition-all',
                    draft.palette === palette.id ? 'border-primary bg-primary-container/40' : 'border-outline-variant/60',
                  )}
                >
                  <span
                    className="h-6 w-6 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                    style={{ backgroundColor: palette.swatch }}
                  />
                  <span className="truncate text-[11px] font-semibold text-on-surface">{palette.label}</span>
                  {draft.palette === palette.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="m3-label px-1">Цвет имени</p>
            <div className="flex flex-wrap gap-2">
              {NAME_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, nameColor: color.id }))}
                  aria-label={color.label}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1.5 transition-all',
                    draft.nameColor === color.id ? 'border-primary bg-primary-container/40' : 'border-outline-variant/60',
                  )}
                >
                  {color.id === 'default' ? (
                    <Sparkles className="h-4 w-4 text-primary" />
                  ) : (
                    <span
                      className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: color.swatch }}
                    />
                  )}
                  <span className="text-[10px] font-semibold text-on-surface">{color.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-outline-variant/60 p-4">
          <Button
            variant="outline"
            className="h-12 flex-1 gap-2 rounded-full"
            onClick={() => setDraft(DEFAULT_CHAT_APPEARANCE)}
          >
            <RotateCcw className="h-4 w-4" /> Сброс
          </Button>
          <Button
            className="h-12 flex-1 rounded-full bg-primary font-bold text-primary-foreground"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
