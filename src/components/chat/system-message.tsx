"use client";

import * as React from 'react';
import { Hash, Info, LogOut, Sparkles, UserPlus } from 'lucide-react';

import type { SystemMessageKind } from '@/lib/system-notifications';
import { cn } from '@/lib/utils';

const KIND_ICONS: Record<SystemMessageKind, typeof Info> = {
  info: Info,
  created: Sparkles,
  joined: UserPlus,
  left: LogOut,
  channel: Hash,
};

interface SystemMessageProps {
  text: string;
  kind?: SystemMessageKind;
  timestamp?: number;
  className?: string;
}

/**
 * Служебное уведомление внутри чата: события, а не сообщения пользователя.
 * Рендерится по центру ленты компактной «пилюлей» в стиле Material 3.
 */
export function SystemMessage({ text, kind = 'info', timestamp, className }: SystemMessageProps) {
  const Icon = KIND_ICONS[kind] ?? Info;

  return (
    <div className={cn('my-3 flex justify-center px-2', className)}>
      <div className="inline-flex max-w-[92%] items-center gap-2 rounded-full bg-surface-high px-3.5 py-1.5 text-[11px] font-medium text-on-surface-variant">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-center leading-snug">{text}</span>
        {timestamp ? (
          <span className="shrink-0 text-[10px] opacity-60">
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
