"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface ArbogramIconProps {
  className?: string;
}

/**
 * Прямая ссылка на изображение из Google Диска.
 */
const ICON_URL = "https://docs.google.com/uc?export=download&id=1KXNoBIvgzPrBLjJrqpq-QR6Tq7DphLpQ";

export function ArbogramIcon({ className }: ArbogramIconProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-lg aspect-square shrink-0 bg-accent/10 flex items-center justify-center", className)}>
      <Image 
        src={ICON_URL}
        alt="Arbogram Logo"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 128px"
        priority
      />
    </div>
  );
}
