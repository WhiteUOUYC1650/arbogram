
"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface CoveChatIconProps {
  className?: string;
}

const LOGO_NORMAL = "/pictures/logo.jpg";
const LOGO_MAY9 = "/pictures/logo905.jpg";

/**
 * Иконка CoveChat.
 * Автоматически переключается на версию 9 мая.
 */
export function ArbogramIcon({ className }: CoveChatIconProps) {
  const [logoPath, setLogoPath] = useState(LOGO_NORMAL);

  useEffect(() => {
    const today = new Date();
    // 4 — это май (0-indexed)
    if (today.getMonth() === 4 && today.getDate() === 9) {
      setLogoPath(LOGO_MAY9);
    } else {
      setLogoPath(LOGO_NORMAL);
    }
  }, []);

  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] shadow-xl aspect-square shrink-0 bg-white flex items-center justify-center border border-primary/10", className)}>
      <img 
        src={logoPath}
        alt="CoveChat"
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );
}
