
"use client";

import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface CoveChatIconProps {
  className?: string;
}

const DEFAULT_ICON = "https://picsum.photos/seed/covechat/200/200";

export function ArbogramIcon({ className }: CoveChatIconProps) {
  const db = useFirestore();
  
  // Читаем документ config/appicon поле base64
  const iconRef = useMemoFirebase(() => (db ? doc(db, "config", "appicon") : null), [db]);
  const { data: iconData, loading } = useDoc(iconRef);

  const displaySrc = iconData?.base64 || DEFAULT_ICON;

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] shadow-xl aspect-square shrink-0 cove-gradient flex items-center justify-center border border-white/20", className)}>
      <img 
        src={displaySrc}
        alt="CoveChat"
        className="w-full h-full object-cover mix-blend-overlay opacity-80"
        loading="eager"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_ICON;
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1/2 h-1/2 bg-white rounded-full blur-2xl opacity-20 animate-pulse" />
      </div>
      {loading && !iconData && (
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
      )}
    </div>
  );
}
