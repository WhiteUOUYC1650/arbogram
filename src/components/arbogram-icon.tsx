
"use client";

import { cn } from "@/lib/utils";

interface CoveChatIconProps {
  className?: string;
}

const LOGO_PATH = "/pictures/logo.png";

/**
 * Иконка CoveChat.
 * Теперь использует исключительно локальный файл из public/pictures/logo.png.
 */
export function ArbogramIcon({ className }: CoveChatIconProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-[1.5rem] shadow-xl aspect-square shrink-0 bg-white flex items-center justify-center border border-primary/10", className)}>
      <img 
        src={LOGO_PATH}
        alt="CoveChat"
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );
}
