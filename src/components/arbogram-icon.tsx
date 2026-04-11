
"use client";

import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface ArbogramIconProps {
  className?: string;
}

const DEFAULT_ICON = "https://picsum.photos/seed/arbogram/200/200";

export function ArbogramIcon({ className }: ArbogramIconProps) {
  const db = useFirestore();
  
  // Читаем документ config/appicon поле base64
  const iconRef = useMemoFirebase(() => (db ? doc(db, "config", "appicon") : null), [db]);
  const { data: iconData, loading } = useDoc(iconRef);

  const displaySrc = iconData?.base64 || DEFAULT_ICON;

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] shadow-xl aspect-square shrink-0 bg-accent/5 flex items-center justify-center border border-white/20", className)}>
      <img 
        src={displaySrc}
        alt="Arbogram"
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          e.currentTarget.src = DEFAULT_ICON;
        }}
      />
      {loading && !iconData && (
        <div className="absolute inset-0 bg-accent/10 animate-pulse" />
      )}
    </div>
  );
}
