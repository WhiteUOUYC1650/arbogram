"use client";

import * as React from 'react';
import { Check, Loader2, RotateCcw, Trash2, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MAX_INLINE_MEDIA_LENGTH, formatDuration, readFileAsDataUrl } from '@/lib/media';

interface VideoNoteRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (payload: { url: string; duration: number }) => void;
}

const MAX_SECONDS = 8;

/**
 * Видеокружок: фронтальная камера обрезается в квадрат через canvas,
 * пишется MediaRecorder-ом и отправляется как квадратное видео до 8 секунд.
 * Ограничение размера — чтобы data-URL влез в документ Firestore.
 */
export function VideoNoteRecorder({ open, onOpenChange, onSend }: VideoNoteRecorderProps) {
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const secondsRef = React.useRef(0);

  const [isRecording, setIsRecording] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isPreparing, setIsPreparing] = React.useState(false);

  const stopDrawing = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const releaseStream = () => {
    stopDrawing();
    stopTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecording = (cancel = false) => {
    const recorderRecorder = recorderRef.current;
    recorderRef.current = null;
    if (cancel) {
      chunksRef.current = [];
    }
    if (recorderRecorder && recorderRecorder.state !== 'inactive') {
      recorderRecorder.stop();
    } else {
      releaseStream();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({ variant: 'destructive', title: 'Видеокружки не поддерживаются устройством' });
      return;
    }

    setIsPreparing(true);
    setPreviewUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas?.getContext('2d');

      if (!canvas || !ctx || !video) throw new Error('Нет доступа к canvas');

      canvas.width = 240;
      canvas.height = 240;

      const draw = () => {
        if (!videoRef.current) return;
        const v = videoRef.current;
        const side = Math.min(v.videoWidth || 240, v.videoHeight || 240);
        const sx = ((v.videoWidth || 240) - side) / 2;
        const sy = ((v.videoHeight || 240) - side) / 2;
        ctx.drawImage(v, sx, sy, side, side, 0, 0, 240, 240);
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(24);
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);

      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );

      const recorder = new MediaRecorder(canvasStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 220_000,
        audioBitsPerSecond: 24_000,
      });

      recorderRef.current = recorder;
      chunksRef.current = [];
      secondsRef.current = 0;
      setSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const duration = secondsRef.current;
        releaseStream();
        setIsRecording(false);

        if (blob.size === 0) return;

        readFileAsDataUrl(blob)
          .then((url) => {
            if (url.length > MAX_INLINE_MEDIA_LENGTH) {
              toast({
                variant: 'destructive',
                title: 'Видеокружок слишком большой',
                description: 'Запишите короче — максимум 8 секунд.',
              });
              return;
            }
            setPreviewUrl(url);
            secondsRef.current = duration;
          })
          .catch(() => toast({ variant: 'destructive', title: 'Не удалось обработать видео' }));
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) stopRecording(false);
      }, 1000);
    } catch {
      releaseStream();
      setIsRecording(false);
      toast({
        variant: 'destructive',
        title: 'Нет доступа к камере',
        description: 'Разрешите камеру и микрофон',
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      stopRecording(true);
      releaseStream();
      setPreviewUrl(null);
      setIsRecording(false);
      setSeconds(0);
    }
    onOpenChange(next);
  };

  React.useEffect(() => () => { stopRecording(true); releaseStream(); }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] flex-col overflow-hidden rounded-[28px] border-none bg-surface-container p-0 shadow-m3-strong sm:max-w-sm">
        <DialogHeader className="space-y-1 border-b border-outline-variant/60 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Video className="h-5 w-5 text-primary" /> Видеокружок
          </DialogTitle>
          <DialogDescription className="text-xs text-on-surface-variant">
            До {MAX_SECONDS} секунд, камера и микрофон
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 p-6">
          <div className="relative h-56 w-56 overflow-hidden rounded-full border-4 border-surface-high bg-black">
            {previewUrl ? (
              <video src={previewUrl} autoPlay loop playsInline muted className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            )}

            {isRecording && (
              <span className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {formatDuration(seconds)}
              </span>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {previewUrl ? (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="h-12 flex-1 gap-2 rounded-full"
                onClick={() => setPreviewUrl(null)}
              >
                <RotateCcw className="h-4 w-4" /> Заново
              </Button>
              <Button
                className="h-12 flex-1 gap-2 rounded-full bg-primary font-bold text-primary-foreground"
                onClick={() => {
                  onSend({ url: previewUrl, duration: secondsRef.current || seconds });
                  handleClose(false);
                }}
              >
                <Check className="h-4 w-4" /> Отправить
              </Button>
            </div>
          ) : isRecording ? (
            <Button
              className="h-12 w-full gap-2 rounded-full bg-destructive font-bold text-destructive-foreground"
              onClick={() => stopRecording(false)}
            >
              <Trash2 className="h-4 w-4" /> Остановить запись
            </Button>
          ) : (
            <Button
              className="h-12 w-full gap-2 rounded-full bg-primary font-bold text-primary-foreground"
              onClick={startRecording}
              disabled={isPreparing}
            >
              {isPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Записать кружок
            </Button>
          )}

          <p className="text-center text-[10px] leading-snug text-on-surface-variant">
            Кружок уходит как короткое видео прямо в сообщении. Держите камеру на уровне лица 🙂
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
