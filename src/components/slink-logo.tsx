"use client";

import * as React from 'react';

import { cn } from '@/lib/utils';

interface SlinkLogoProps {
  className?: string;
}

/**
 * Логотип SLink Beta.
 * Показываем исходный файл без перекраски — фирменный жёлтый бабл остаётся как есть.
 */
export function SlinkLogo({ className }: SlinkLogoProps) {
  return (
    <div
      className={cn(
        'relative aspect-square shrink-0 overflow-hidden rounded-[26%] bg-white shadow-m3',
        className,
      )}
      role="img"
      aria-label="SLink Beta"
    >
      <img
        src="/icons/SLinkBetaLogo.png"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
        loading="eager"
        draggable={false}
      />
    </div>
  );
}
