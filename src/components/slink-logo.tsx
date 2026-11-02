"use client";

import * as React from 'react';

import { cn } from '@/lib/utils';

interface SlinkLogoProps {
  className?: string;
}

/**
 * Логотип SLink: монолинейная «S» (link) на фирменном градиенте.
 * 9 мая автоматически подменяется на памятную версию логотипа.
 */
export function SlinkLogo({ className }: SlinkLogoProps) {
  const gradientId = React.useId().replace(/:/g, '');
  const [memoryDay, setMemoryDay] = React.useState(false);

  React.useEffect(() => {
    const today = new Date();
    // 4 — май (0-indexed)
    setMemoryDay(today.getMonth() === 4 && today.getDate() === 9);
  }, []);

  if (memoryDay) {
    return (
      <div
        className={cn(
          'relative aspect-square shrink-0 overflow-hidden rounded-[28%] bg-surface-highest shadow-m3',
          className,
        )}
      >
        <img
          src="/pictures/logo905.jpg"
          alt="SLink"
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative aspect-square shrink-0 overflow-hidden rounded-[28%] shadow-m3',
        className,
      )}
      aria-label="SLink"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="55%" stopColor="#4C6BFF" />
            <stop offset="100%" stopColor="#22B8E6" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${gradientId})`} />
        <path
          d="M41.6 21.4c-2.3-2.7-5.6-4.2-9.3-4.2-4.9 0-8.2 2.6-8.2 6.5 0 3.6 2.5 5.5 8.2 6.7 5.7 1.2 8.2 3 8.2 6.6 0 4-3.4 6.6-8.4 6.6-3.9 0-7.3-1.6-9.7-4.4"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5.2"
          strokeLinecap="round"
        />
        <circle cx="20.4" cy="44.2" r="2.6" fill="#FFFFFF" opacity="0.85" />
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/25" />
    </div>
  );
}
