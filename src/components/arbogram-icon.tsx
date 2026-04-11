"use client";

import { cn } from "@/lib/utils";

interface ArbogramIconProps {
  className?: string;
}

/**
 * Прямая ссылка на иконку Arbogram. 
 * Используем стандартный тег img для лучшей совместимости в WebView/APK.
 */
const ICON_URL = "https://docs.google.com/uc?id=1KXNoBIvgzPrBLjJrqpq-QR6Tq7DphLpQ";

export function ArbogramIcon({ className }: ArbogramIconProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-lg aspect-square shrink-0 bg-accent/10 flex items-center justify-center", className)}>
      <img 
        src={ICON_URL}
        alt="Arbogram Logo"
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );
}
