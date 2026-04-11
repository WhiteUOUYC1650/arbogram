"use client";

import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

interface ArbogramIconProps {
  className?: string;
}

/**
 * Фолбек-иконка, если в Firestore ничего не задано.
 */
const DEFAULT_ICON_URL = "https://docs.google.com/uc?export=download&id=1KXNoBIvgzPrBLjJrqpq-QR6Tq7DphLpQ";

export function ArbogramIcon({ className }: ArbogramIconProps) {
  const db = useFirestore();
  
  // Читаем иконку из Firestore по пути config/appicon
  const iconRef = useMemoFirebase(() => (db ? doc(db, "config", "appicon") : null), [db]);
  const { data: iconData } = useDoc(iconRef);

  // Если в документе есть поле url, используем его, иначе фолбек
  const iconUrl = iconData?.url || DEFAULT_ICON_URL;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-lg aspect-square shrink-0 bg-accent/10 flex items-center justify-center", className)}>
      <img 
        src={iconUrl}
        alt="Arbogram Logo"
        className="w-full h-full object-cover"
        loading="eager"
        onError={(e) => {
          // Фолбек на случай проблем с сетью или неверного URL
          e.currentTarget.src = "https://picsum.photos/seed/arbogram/200/200";
        }}
      />
    </div>
  );
}
