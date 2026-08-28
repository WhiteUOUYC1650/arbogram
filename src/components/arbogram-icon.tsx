
"use client";

import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface CoveChatIconProps {
  className?: string;
}

const DEFAULT_ICON = "/pictures/logo.png";

export function ArbogramIcon({ className }: CoveChatIconProps) {
  const db = useFirestore();
  
  // По-прежнему пытаемся прочитать динамическую иконку из базы, если она есть
  const iconRef = useMemoFirebase(() => (db ? doc(db, "config", "appicon") : null), [db]);
  const { data: iconData, loading } = useDoc(iconRef);

  // Если в базе пусто, используем твой новый файл logo.png
  const displaySrc = iconData?.base64 || DEFAULT_ICON;

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] shadow-xl aspect-square shrink-0 bg-white flex items-center justify-center border border-primary/10", className)}>
      <img 
        src={displaySrc}
        alt="CoveChat"
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_ICON;
        }}
      />
      {loading && !iconData && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}
