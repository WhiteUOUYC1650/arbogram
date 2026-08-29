
"use client";

import * as React from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, addDoc, updateDoc, onSnapshot, setDoc, query, where, limit, deleteDoc } from "firebase/firestore";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

/**
 * Оверлей звонка. Управляет состоянием WebRTC и UI звонка.
 */
export function CallOverlay() {
  const db = useFirestore();
  const { user } = useUser();
  const [activeCall, setActiveCall] = React.useState<any>(null);
  const [callStatus, setCallStatus] = React.useState<"idle" | "dialing" | "ringing" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = React.useState(false);
  
  const peerConnection = React.useRef<RTCPeerConnection | null>(null);
  const localStream = React.useRef<MediaStream | null>(null);
  const remoteStream = React.useRef<MediaStream | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Конфигурация STUN серверов
  const rtcConfig = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    ],
  };

  // Слушаем входящие звонки
  React.useEffect(() => {
    if (!db || !user) return;
    
    const q = query(
      collection(db, "calls"),
      where("receiverId", "==", user.uid),
      where("status", "in", ["dialing", "ringing"]),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && callStatus === "idle") {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setActiveCall(callData);
        setCallStatus("ringing");
      }
    });

    return () => unsubscribe();
  }, [db, user, callStatus]);

  // Следим за состоянием активного звонка (для сброса)
  React.useEffect(() => {
    if (!db || !activeCall) return;

    const unsubscribe = onSnapshot(doc(db, "calls", activeCall.id), (snap) => {
      const data = snap.data();
      if (!data || data.status === "ended") {
        handleEndCall();
      } else if (data.status === "connected" && callStatus !== "connected") {
        setCallStatus("connected");
      }
    });

    return () => unsubscribe();
  }, [db, activeCall]);

  const setupWebRTC = async () => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current!));

    remoteStream.current = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.current?.addTrack(track));
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream.current;
    };

    return pc;
  };

  const startCall = async (receiverId: string) => {
    if (!db || !user) return;
    setCallStatus("dialing");

    try {
      const pc = await setupWebRTC();
      const callDoc = doc(collection(db, "calls"));
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "calls", callDoc.id, "callerCandidates"), event.candidate.toJSON());
        }
      };

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const offer = {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      };

      await setDoc(callDoc, {
        callerId: user.uid,
        receiverId,
        offer,
        status: "dialing",
        timestamp: Date.now()
      });

      setActiveCall({ id: callDoc.id, callerId: user.uid, receiverId });

      // Ждем ответа
      onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.answer && !pc.currentRemoteDescription) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answerDescription);
        }
      });

      // Слушаем ICE кандидатов от получателя
      onSnapshot(collection(db, "calls", callDoc.id, "receiverCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate);
          }
        });
      });

    } catch (e) {
      console.error("Call start error:", e);
      handleEndCall();
    }
  };

  const answerCall = async () => {
    if (!db || !activeCall) return;
    setCallStatus("connected");

    try {
      const pc = await setupWebRTC();

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(collection(db, "calls", activeCall.id, "receiverCandidates"), event.candidate.toJSON());
        }
      };

      const callDoc = doc(db, "calls", activeCall.id);
      const callData = (await (await getDoc(callDoc)).data());

      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));

      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      await updateDoc(callDoc, {
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: "connected"
      });

      // Слушаем ICE кандидатов от звонящего
      onSnapshot(collection(db, "calls", activeCall.id, "callerCandidates"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const candidate = new RTCIceCandidate(change.doc.data());
            pc.addIceCandidate(candidate);
          }
        });
      });

    } catch (e) {
      console.error("Call answer error:", e);
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    if (db && activeCall) {
      updateDoc(doc(db, "calls", activeCall.id), { status: "ended" }).catch(() => {});
    }
    
    peerConnection.current?.close();
    localStream.current?.getTracks().forEach(track => track.stop());
    
    peerConnection.current = null;
    localStream.current = null;
    remoteStream.current = null;
    setActiveCall(null);
    setCallStatus("idle");
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  // Экспортируем функцию начала звонка в глобальный контекст для ChatWindow
  React.useEffect(() => {
    (window as any).__startCall = startCall;
    return () => { delete (window as any).__startCall; };
  }, [db, user]);

  if (callStatus === "idle") return null;

  const otherPartyId = activeCall?.callerId === user?.uid ? activeCall?.receiverId : activeCall?.callerId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      
      <div className="bg-card w-full max-w-sm mx-4 p-8 rounded-[3rem] shadow-2xl border border-primary/10 flex flex-col items-center gap-8 text-center">
        <div className="relative">
          <UserAvatar 
            userId={otherPartyId} 
            className="w-32 h-32 border-4 border-primary/20 shadow-xl" 
          />
          {callStatus === "connected" && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full border-4 border-card animate-pulse">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-headline tracking-tight">
            {callStatus === "ringing" ? "Входящий вызов" : callStatus === "dialing" ? "Набор номера..." : "В разговоре"}
          </h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">
            {callStatus === "connected" ? "Соединено" : "Cove Voice"}
          </p>
        </div>

        <div className="flex items-center gap-6 mt-4">
          {callStatus === "ringing" ? (
            <>
              <Button 
                onClick={handleEndCall}
                variant="destructive"
                className="w-16 h-16 rounded-full p-0 shadow-lg shadow-destructive/20 active:scale-95 transition-transform"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <Button 
                onClick={answerCall}
                className="w-16 h-16 rounded-full p-0 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-transform"
              >
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
                  isMuted ? "bg-red-500/10 border-red-500 text-red-500" : "border-primary/20 text-muted-foreground hover:text-primary"
                )}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button 
                onClick={handleEndCall}
                variant="destructive"
                className="w-20 h-20 rounded-full p-0 shadow-xl shadow-destructive/30 active:scale-90 transition-transform"
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <Button 
                variant="outline"
                className="w-14 h-14 rounded-full p-0 border-2 border-primary/20 text-muted-foreground"
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
