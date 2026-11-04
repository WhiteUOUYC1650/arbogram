'use client';

import * as React from 'react';
import type { User } from 'firebase/auth';
import { addDoc, collection, doc, type Firestore } from 'firebase/firestore';

import { useToast } from '@/hooks/use-toast';

/** Сигнализация звонка идёт через сообщения чата (type: 'call'). */
export interface CallSignal {
  id?: string;
  type: 'call';
  callId: string;
  action: 'offer' | 'answer' | 'ice' | 'end' | 'decline';
  from: string;
  timestamp: number;
  sdp?: string;
  candidate?: any;
}

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'active';

interface UseAudioCallOptions {
  db: Firestore | null;
  chatId: string;
  user: User | null;
  messages: any[];
  title: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Аудиозвонок 1:1 по WebRTC. Сигнализация — документы в messages (type: 'call'),
 * без собственных коллекций и без изменения правил Firestore.
 *
 * Для работы нужны: оба пользователя онлайн и разрешённый микрофон.
 * TURN-сервер не используется (в сложных NAT звонок может не установиться).
 */
export function useAudioCall({ db, chatId, user, messages, title }: UseAudioCallOptions) {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<CallStatus>('idle');
  const [incoming, setIncoming] = React.useState<CallSignal | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);

  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const callIdRef = React.useRef<string | null>(null);
  const handledSignals = React.useRef<Set<string>>(new Set());
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const sendSignal = React.useCallback(
    async (payload: Omit<CallSignal, 'type' | 'from' | 'timestamp'>) => {
      if (!db || !user || !chatId) return;
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        type: 'call',
        senderId: user.uid,
        senderName: user.displayName || 'SLink',
        from: user.uid,
        timestamp: Date.now(),
        ...payload,
      }).catch((error) => console.warn('[SLink] Не удалось отправить сигнал звонка:', error));
    },
    [db, user, chatId],
  );

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanup = React.useCallback(() => {
    stopTimer();
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    callIdRef.current = null;
    setStatus('idle');
    setIncoming(null);
    setIsMuted(false);
    setSeconds(0);
  }, []);

  const createPeer = React.useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && callIdRef.current) {
          sendSignal({
            callId: callIdRef.current,
            action: 'ice',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('active');
          setIncoming(null);
          stopTimer();
          timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
        }
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          toast({ variant: 'destructive', title: 'Соединение прервано' });
          cleanup();
        }
      };

      return pc;
    },
    [cleanup, sendSignal, toast],
  );

  const startCall = React.useCallback(async () => {
    if (!db || !user) return;

    if (typeof RTCPeerConnection === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({ variant: 'destructive', title: 'Звонки не поддерживаются устройством' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      callIdRef.current = `call_${Date.now().toString(36)}`;
      setStatus('calling');
      setSeconds(0);

      const pc = createPeer(stream);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      await sendSignal({
        callId: callIdRef.current,
        action: 'offer',
        sdp: JSON.stringify(offer),
      });

      // Если не ответили за 45 секунд — отменяем
      stopTimer();
      timerRef.current = setTimeout(() => {
        if (callIdRef.current) {
          sendSignal({ callId: callIdRef.current, action: 'end' });
          toast({ title: 'Звонок отменён', description: 'Собеседник не ответил' });
          cleanup();
        }
      }, 45000) as unknown as ReturnType<typeof setInterval>;
    } catch {
      toast({
        variant: 'destructive',
        title: 'Нет доступа к микрофону',
        description: 'Разрешите микрофон, чтобы звонить',
      });
      cleanup();
    }
  }, [cleanup, createPeer, db, sendSignal, toast, user]);

  const acceptCall = React.useCallback(async () => {
    if (!incoming || !db) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      callIdRef.current = incoming.callId;
      setStatus('active');
      setSeconds(0);

      const pc = createPeer(stream);
      await pc.setRemoteDescription(JSON.parse(incoming.sdp || '{}'));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal({
        callId: incoming.callId,
        action: 'answer',
        sdp: JSON.stringify(answer),
      });

      setIncoming(null);
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось принять звонок' });
      cleanup();
    }
  }, [cleanup, createPeer, db, incoming, sendSignal, toast]);

  const declineCall = React.useCallback(async () => {
    if (incoming) {
      await sendSignal({ callId: incoming.callId, action: 'decline' });
    }
    cleanup();
  }, [cleanup, incoming, sendSignal]);

  const endCall = React.useCallback(async () => {
    if (callIdRef.current) {
      await sendSignal({ callId: callIdRef.current, action: 'end' });
    }
    cleanup();
  }, [cleanup, sendSignal]);

  const toggleMute = React.useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
  }, [isMuted]);

  // Обработка входящих сигналов из сообщений
  React.useEffect(() => {
    if (!user) return;

    const signals = (messages || []).filter(
      (message) => message.type === 'call' && message.from !== user.uid,
    ) as CallSignal[];

    for (const signal of signals) {
      const key = `${signal.id || signal.callId}_${signal.action}`;
      if (handledSignals.current.has(key)) continue;
      handledSignals.current.add(key);

      if (signal.action === 'offer') {
        const isFresh = Date.now() - Number(signal.timestamp || 0) < 60000;
        if (!isFresh || status === 'active' || status === 'calling') continue;
        setIncoming(signal);
        setStatus('ringing');
      }

      if (signal.action === 'answer' && pcRef.current && callIdRef.current === signal.callId) {
        pcRef.current.setRemoteDescription(JSON.parse(signal.sdp || '{}')).catch(() => {});
      }

      if (signal.action === 'ice' && pcRef.current && callIdRef.current === signal.callId) {
        pcRef.current.addIceCandidate(signal.candidate).catch(() => {});
      }

      if ((signal.action === 'end' || signal.action === 'decline') && callIdRef.current === signal.callId) {
        if (signal.action === 'decline') {
          toast({ title: 'Звонок отклонён' });
        }
        cleanup();
      }
    }
  }, [messages, user, status, cleanup, toast]);

  React.useEffect(() => cleanup, [cleanup]);

  return {
    status,
    incoming,
    isMuted,
    seconds,
    title,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
}
