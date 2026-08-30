
"use client";

import * as React from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2, SignalHigh } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useUser } from "@/firebase";
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  setDoc, 
  query, 
  where, 
  limit, 
  getDoc, 
  orderBy 
} from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/**
 * Оверлей звонка. CoveChat Relay Engine v1.1
 * Использует Firestore как реле для аудио-чанков (Base64) для обхода любых блокировок.
 */
export function CallOverlay() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activeCall, setActiveCall] = React.useState<any>(null);
  const [callStatus, setCallStatus] = React.useState<"idle" | "dialing" | "ringing" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = React.useState(false);
  const [otherUserData, setOtherUserData] = React.useState<any>(null);
  
  const [audioQueue, setAudioQueue] = React.useState<string[]>([]);
  const [isRelayPlaying, setIsRelayPlaying] = React.useState(false);

  const localStream = React.useRef<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Слушатель входящих звонков
  React.useEffect(() => {
    if (!db || !user) return;
    
    const q = query(
      collection(db, "calls"),
      where("receiverId", "==", user.uid),
      where("status", "==", "dialing"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty && callStatus === "idle") {
        const docSnap = snapshot.docs[0];
        const callData = { id: docSnap.id, ...docSnap.data() };
        
        const callerSnap = await getDoc(doc(db, "users", callData.callerId));
        if (callerSnap.exists()) setOtherUserData(callerSnap.data());
        
        setActiveCall(callData);
        setCallStatus("ringing");
      }
    });

    return () => unsubscribe();
  }, [db, user, callStatus]);

  // Слушатель изменений статуса звонка и прием чанков
  React.useEffect(() => {
    if (!db || !activeCall || !user) return;

    const unsubscribeStatus = onSnapshot(doc(db, "calls", activeCall.id), (snap) => {
      const data = snap.data();
      if (!data || data.status === "ended") {
        handleEndCall();
      } else if (data.status === "connected" && callStatus !== "connected") {
        setCallStatus("connected");
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      }
    });

    // Прием аудио-чанков от собеседника
    const chunksQuery = query(
      collection(db, "calls", activeCall.id, "chunks"),
      where("senderId", "!=", user.uid),
      orderBy("timestamp", "asc")
    );

    const unsubscribeChunks = onSnapshot(chunksQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const chunkData = change.doc.data().data;
          setAudioQueue(prev => [...prev, chunkData]);
        }
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeChunks();
    };
  }, [db, activeCall, callStatus, user]);

  // Воспроизведение очереди чанков
  React.useEffect(() => {
    if (audioQueue.length > 0 && !isRelayPlaying && remoteAudioRef.current) {
      playNextChunk();
    }
  }, [audioQueue, isRelayPlaying]);

  const playNextChunk = () => {
    if (audioQueue.length === 0 || !remoteAudioRef.current) return;
    
    const nextChunk = audioQueue[0];
    setAudioQueue(prev => prev.slice(1));
    setIsRelayPlaying(true);

    remoteAudioRef.current.src = nextChunk;
    remoteAudioRef.current.play().catch(e => {
      console.warn("Playback blocked", e);
      setIsRelayPlaying(false);
    });
  };

  const startRelayRecording = (stream: MediaStream, callId: string) => {
    if (!user) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && db && user) {
        const reader = new FileReader();
        reader.readAsDataURL(event.data);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          addDoc(collection(db, "calls", callId, "chunks"), {
            data: base64,
            senderId: user.uid,
            timestamp: Date.now()
          });
        };
      }
    };

    recorder.start(1000); // Отправка чанка каждую секунду
  };

  const startCall = async (receiverId: string) => {
    if (!db || !user) return;
    setCallStatus("dialing");

    try {
      const receiverSnap = await getDoc(doc(db, "users", receiverId));
      if (receiverSnap.exists()) setOtherUserData(receiverSnap.data());

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      const callDoc = doc(collection(db, "calls"));
      await setDoc(callDoc, {
        callerId: user.uid,
        receiverId,
        status: "dialing",
        timestamp: Date.now()
      });

      setActiveCall({ id: callDoc.id, callerId: user.uid, receiverId });
      startRelayRecording(stream, callDoc.id);

      connectionTimeoutRef.current = setTimeout(() => {
        if (callStatus !== "connected") {
          toast({ title: "Нет ответа", description: "Собеседник не ответил." });
          handleEndCall();
        }
      }, 30000);

    } catch (e) {
      console.error("Start call error:", e);
      handleEndCall();
      toast({ variant: "destructive", title: "Ошибка", description: "Нужен доступ к микрофону." });
    }
  };

  const answerCall = async () => {
    if (!db || !activeCall || !user) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      await updateDoc(doc(db, "calls", activeCall.id), {
        status: "connected"
      });

      setCallStatus("connected");
      startRelayRecording(stream, activeCall.id);

    } catch (e) {
      console.error("Answer call error:", e);
      handleEndCall();
      toast({ variant: "destructive", title: "Ошибка", description: "Нужен доступ к микрофону." });
    }
  };

  const handleEndCall = async () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    
    if (db && activeCall) {
      updateDoc(doc(db, "calls", activeCall.id), { status: "ended" }).catch(() => {});
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    setActiveCall(null);
    setCallStatus("idle");
    setOtherUserData(null);
    setIsMuted(false);
    setAudioQueue([]);
    setIsRelayPlaying(false);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  React.useEffect(() => {
    (window as any).__startCall = startCall;
    return () => { delete (window as any).__startCall; };
  }, [db, user]);

  if (callStatus === "idle") return null;

  const otherPartyId = activeCall?.callerId === user?.uid ? activeCall?.receiverId : activeCall?.callerId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <audio 
        ref={remoteAudioRef} 
        onEnded={() => setIsRelayPlaying(false)} 
        className="hidden" 
      />
      
      <div className="bg-card w-full max-w-sm mx-4 p-8 rounded-[3.5rem] shadow-2xl border border-primary/10 flex flex-col items-center gap-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10">
          <div className={cn(
            "h-full bg-primary transition-all duration-[30000ms] ease-linear", 
            callStatus === "dialing" ? "w-full" : "w-0"
          )} />
        </div>

        <div className="relative">
          <div className={cn(
            "absolute inset-0 bg-primary/20 rounded-full", 
            callStatus !== "idle" && "animate-ping duration-1000"
          )} />
          <UserAvatar 
            userId={otherPartyId} 
            fallback={otherUserData?.displayName} 
            className="w-32 h-32 border-4 border-primary/20 shadow-xl relative z-10" 
          />
          {callStatus === "connected" && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full border-4 border-card z-20 shadow-lg">
              <SignalHigh className="w-5 h-5 text-white animate-pulse" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{otherUserData?.displayName || "Пользователь"}</h2>
          <div className="flex items-center justify-center gap-2">
            {callStatus === "dialing" || callStatus === "connected" ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            ) : null}
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] opacity-80">
              {callStatus === "ringing" ? "Входящий Cove-вызов" : 
               callStatus === "dialing" ? "Вызов (Relay Mode)..." : 
               callStatus === "connected" ? "В разговоре (HD)" : "Соединение..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          {callStatus === "ringing" ? (
            <>
              <Button onClick={handleEndCall} variant="destructive" className="w-16 h-16 rounded-full p-0 shadow-lg active:scale-95 transition-transform">
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button onClick={answerCall} className="w-16 h-16 rounded-full p-0 bg-green-500 text-white shadow-lg active:scale-95 transition-transform">
                <Phone className="w-6 h-6" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={toggleMute} 
                className={cn(
                  "w-14 h-14 rounded-full p-0 border-2 transition-all active:scale-95", 
                  isMuted ? "bg-red-500/10 border-red-500 text-red-500" : "border-primary/20 text-muted-foreground"
                )}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button onClick={handleEndCall} variant="destructive" className="w-20 h-20 rounded-full p-0 shadow-xl active:scale-90 transition-transform">
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button variant="outline" className="w-14 h-14 rounded-full p-0 border-2 border-primary/20 text-muted-foreground">
                <Volume2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>

        <p className="text-[9px] text-muted-foreground mt-2 opacity-60">
          Cove Relay Engine v1.1 • Защищенное соединение
        </p>
      </div>
    </div>
  );
}
