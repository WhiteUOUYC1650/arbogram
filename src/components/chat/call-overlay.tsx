
"use client";

import * as React from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2, AlertCircle } from "lucide-react";
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
  deleteDoc, 
  getDocs 
} from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/**
 * Оверлей звонка. Управляет состоянием WebRTC и UI звонка.
 * CoveChat v1.1 Audio Engine - Optimized for Network Resilience.
 */
export function CallOverlay() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [activeCall, setActiveCall] = React.useState<any>(null);
  const [callStatus, setCallStatus] = React.useState<"idle" | "dialing" | "ringing" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = React.useState(false);
  const [otherUserData, setOtherUserData] = React.useState<any>(null);
  
  const peerConnection = React.useRef<RTCPeerConnection | null>(null);
  const localStream = React.useRef<MediaStream | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const rtcConfig = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
      { urls: ["stun:stun.l.google.com:19302"] },
    ],
    iceCandidatePoolSize: 10,
  };

  // Слушатель входящих звонков
  React.useEffect(() => {
    if (!db || !user) return;
    
    const q = query(
      collection(db, "calls"),
      where("receiverId", "==", user.uid),
      where("status", "in", ["dialing", "ringing"]),
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

  // Слушатель изменений текущего звонка
  React.useEffect(() => {
    if (!db || !activeCall) return;

    const unsubscribe = onSnapshot(doc(db, "calls", activeCall.id), (snap) => {
      const data = snap.data();
      if (!data || data.status === "ended") {
        handleEndCall();
      } else if (data.status === "connected" && callStatus !== "connected") {
        setCallStatus("connected");
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      }
    });

    return () => unsubscribe();
  }, [db, activeCall, callStatus]);

  const initPeerConnection = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(e => console.warn("Audio play blocked", e));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        toast({
          variant: "destructive",
          title: "Ошибка связи",
          description: "Соединение заблокировано сетью. Попробуйте голосовые сообщения."
        });
        handleEndCall();
      }
    };

    return pc;
  };

  const startCall = async (receiverId: string) => {
    if (!db || !user) return;
    setCallStatus("dialing");

    try {
      const receiverSnap = await getDoc(doc(db, "users", receiverId));
      if (receiverSnap.exists()) setOtherUserData(receiverSnap.data());

      // 1. Захватываем микрофон ПОСЛЕ действия пользователя
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      const pc = initPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const callDoc = doc(collection(db, "calls"));
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "calls", callDoc.id, "callerCandidates"), event.candidate.toJSON());
        }
      };

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      await setDoc(callDoc, {
        callerId: user.uid,
        receiverId,
        offer: { sdp: offerDescription.sdp, type: offerDescription.type },
        status: "dialing",
        timestamp: Date.now()
      });

      setActiveCall({ id: callDoc.id, callerId: user.uid, receiverId });

      // Тайм-аут на установку соединения (25 сек)
      connectionTimeoutRef.current = setTimeout(() => {
        if (callStatus !== "connected") {
          toast({ title: "Нет ответа", description: "Собеседник не отвечает или связь заблокирована." });
          handleEndCall();
        }
      }, 25000);

      onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      onSnapshot(collection(db, "calls", callDoc.id, "receiverCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.warn(e));
          }
        });
      });

    } catch (e) {
      console.error("Start call error:", e);
      handleEndCall();
      toast({ variant: "destructive", title: "Ошибка", description: "Нужен доступ к микрофону." });
    }
  };

  const answerCall = async () => {
    if (!db || !activeCall || !user) return;
    
    try {
      // 1. Захватываем микрофон при ответе
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      const pc = initPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "calls", activeCall.id, "receiverCandidates"), event.candidate.toJSON());
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      await updateDoc(doc(db, "calls", activeCall.id), {
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: "connected"
      });

      setCallStatus("connected");

      onSnapshot(collection(db, "calls", activeCall.id, "callerCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(e => console.warn(e));
          }
        });
      });

    } catch (e) {
      console.error("Answer call error:", e);
      handleEndCall();
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось подключить микрофон." });
    }
  };

  const handleEndCall = async () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    
    if (db && activeCall) {
      updateDoc(doc(db, "calls", activeCall.id), { status: "ended" }).catch(() => {});
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setActiveCall(null);
    setCallStatus("idle");
    setOtherUserData(null);
    setIsMuted(false);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      
      <div className="bg-card w-full max-w-sm mx-4 p-8 rounded-[3.5rem] shadow-2xl border border-primary/10 flex flex-col items-center gap-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
          <div className={cn("h-full bg-primary transition-all duration-[25000ms] ease-linear", callStatus === "dialing" ? "w-full" : "w-0")} />
        </div>

        <div className="relative">
          <div className={cn("absolute inset-0 bg-primary/20 rounded-full", callStatus !== "idle" && "animate-ping duration-1000")} />
          <UserAvatar userId={otherPartyId} fallback={otherUserData?.displayName} className="w-32 h-32 border-4 border-primary/20 shadow-xl relative z-10" />
          {callStatus === "connected" && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full border-4 border-card z-20">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{otherUserData?.displayName || "Пользователь"}</h2>
          <div className="flex items-center justify-center gap-2">
            {callStatus === "dialing" || callStatus === "ringing" ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            ) : null}
            <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] opacity-80">
              {callStatus === "ringing" ? "Входящий вызов" : 
               callStatus === "dialing" ? "Вызов..." : 
               callStatus === "connected" ? "В разговоре" : "Соединение..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          {callStatus === "ringing" ? (
            <>
              <Button onClick={handleEndCall} variant="destructive" className="w-16 h-16 rounded-full p-0 shadow-lg active:scale-95 transition-transform"><PhoneOff className="w-6 h-6" /></Button>
              <Button onClick={answerCall} className="w-16 h-16 rounded-full p-0 bg-green-500 text-white shadow-lg active:scale-95 transition-transform"><Phone className="w-6 h-6" /></Button>
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
              <Button onClick={handleEndCall} variant="destructive" className="w-20 h-20 rounded-full p-0 shadow-xl active:scale-90 transition-transform"><PhoneOff className="w-8 h-8" /></Button>
              <Button variant="outline" className="w-14 h-14 rounded-full p-0 border-2 border-primary/20 text-muted-foreground"><Volume2 className="w-5 h-5" /></Button>
            </>
          )}
        </div>

        {callStatus === "dialing" && (
          <p className="text-[10px] text-muted-foreground animate-pulse mt-2">
            Если соединение не установится, используйте голосовые сообщения
          </p>
        )}
      </div>
    </div>
  );
}
