
"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

interface ArbogramIconProps {
  className?: string;
}

/**
 * Компонент иконки Arbogram.
 * Чтобы заменить иконку, просто вставьте вашу ссылку в переменную ICON_URL ниже.
 * 
 * Про Google Диск: чтобы ссылка работала как прямая картинка, используйте формат:
 * https://docs.google.com/uc?export=download&id=ID_ВАШЕГО_ФАЙЛА
 */
const ICON_URL = "https://picsum.photos/seed/arbogram/200/200"; // <--- ВСТАВЬТЕ ССЫЛКУ СЮДА

export function ArbogramIcon({ className }: ArbogramIconProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-lg aspect-square shrink-0 bg-accent/10 flex items-center justify-center", className)}>
      <Image 
        src={ICON_URL}
        alt="Arbogram Logo"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 128px"
      />
    </div>
  );
}
