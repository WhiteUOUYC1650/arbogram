"use client";

import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface ArbogramIconProps {
  className?: string;
}

/**
 * Фолбек-иконка (Base64 или URL), если в Firestore ничего не задано.
 */
const DEFAULT_ICON = "https://docs.google.com/uc?export=download&id=1KXNoBIvgzPrBLjJrqpq-QR6Tq7DphLpQ";

export function ArbogramIcon({ className }: ArbogramIconProps) {
  const db = useFirestore();
  
  // Читаем иконку из Firestore: коллекция config, документ appicon
  const iconRef = useMemoFirebase(() => (db ? doc(db, "config", "appicon") : null), [db]);
  const { data: iconData, loading } = useDoc(iconRef);

  // Используем поле base64 из документа, если оно есть, иначе фолбек
  const displaySrc = iconData?.base64 || DEFAULT_ICON;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-lg aspect-square shrink-0 bg-accent/10 flex items-center justify-center", className)}>
      <img 
        src={displaySrc}
        alt="Arbogram Logo"
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          // Фолбек на случай битых данных
          e.currentTarget.src = "https://picsum.photos/seed/arbogram/200/200";
        }}
      />
      {loading && !iconData && (
        <div className="absolute inset-0 bg-white/20 animate-pulse" />
      )}
    </div>
  );
}
