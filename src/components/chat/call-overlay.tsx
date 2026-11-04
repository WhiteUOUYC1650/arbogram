"use client";

import * as React from 'react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SlinkLogo } from '@/components/slink-logo';
import type { CallSignal, CallStatus } from '@/lib/use-audio-call';

interface CallOverlayProps {
  status: CallStatus;
  incoming: CallSignal | null;
  seconds: number;
  isMuted: boolean;
  title: string;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  onEnd: () => void;
  onMute: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

function formatTime(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Экран аудиозвонка: исходящий, входящий и активный разговор. */
export function CallOverlay({
  status,
  incoming,
  seconds,
  isMuted,
  title,
  remoteAudioRef,
  onEnd,
  onMute,
  onAccept,
  onDecline,
}: CallOverlayProps) {
  if (status === 'idle' && !incoming) return null;

  const isIncoming = status === 'ringing';
  const isActive = status === 'active';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-md dark:bg-black/75">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      <div className="anim-pop w-full max-w-sm rounded-[32px] bg-surface-container p-7 text-center shadow-m3-strong">
        <div className="relative mx-auto w-fit">
          <SlinkLogo className="h-24 w-24" />
          {isActive && (
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-surface-container bg-success" />
          )}
          {isIncoming && (
            <span className="anim-pulse-ring absolute inset-0 rounded-[26%]" aria-hidden />
          )}
        </div>

        <h2 className="mt-4 text-xl font-extrabold tracking-tight text-on-surface">{title}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {isIncoming
            ? 'Входящий аудиозвонок'
            : isActive
              ? formatTime(seconds)
              : 'Вызываем…'}
        </p>

        {isIncoming ? (
          <div className="mt-7 flex items-center justify-center gap-4">
            <Button
              className="h-14 w-14 rounded-full bg-destructive p-0 text-destructive-foreground shadow-m3"
              onClick={onDecline}
              aria-label="Отклонить звонок"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              className="h-14 w-14 rounded-full bg-success p-0 text-success-foreground shadow-m3"
              onClick={onAccept}
              aria-label="Принять звонок"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <div className="mt-7 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              className="h-14 w-14 rounded-full p-0"
              onClick={onMute}
              aria-label={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            <Button
              className="h-14 w-14 rounded-full bg-destructive p-0 text-destructive-foreground shadow-m3"
              onClick={onEnd}
              aria-label="Завершить звонок"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        )}

        <p className="mt-5 text-[10px] leading-snug text-on-surface-variant/80">
          Звонок идёт напрямую между устройствами (WebRTC), без записи на сервере.
        </p>
      </div>
    </div>
  );
}
