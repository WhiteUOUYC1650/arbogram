"use client";

import * as React from 'react';

import { cn } from '@/lib/utils';

interface SlinkLogoProps {
  className?: string;
}

const S_PATH =
  'M41.6 21.4c-2.3-2.7-5.6-4.2-9.3-4.2-4.9 0-8.2 2.6-8.2 6.5 0 3.6 2.5 5.5 8.2 6.7 5.7 1.2 8.2 3 8.2 6.6 0 4-3.4 6.6-8.4 6.6-3.9 0-7.3-1.6-9.7-4.4';

/**
 * Логотип SLink: монолинейная «S» (link) на фирменном градиенте.
 * 9 мая плитка автоматически окрашивается в цвета памятной ленты.
 */
export function SlinkLogo({ className }: SlinkLogoProps) {
  const gradientId = React.useId().replace(/:/g, '');
  const [memoryDay, setMemoryDay] = React.useState(false);

  React.useEffect(() => {
    const today = new Date();
    // 4 — май (0-indexed)
    setMemoryDay(today.getMonth() === 4 && today.getDate() === 9);
  }, []);

  return (
    <div
      className={cn('relative aspect-square shrink-0 overflow-hidden rounded-[28%] shadow-m3', className)}
      aria-label="SLink"
      role="img"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${gradientId}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="55%" stopColor="#4C6BFF" />
            <stop offset="100%" stopColor="#22B8E6" />
          </linearGradient>
          <pattern
            id={`${gradientId}-ribbon`}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="16" height="16" fill="#1C1B1F" />
            <rect y="4" width="16" height="5" fill="#E08A2E" />
          </pattern>
        </defs>

        <rect width="64" height="64" fill={memoryDay ? `url(#${gradientId}-ribbon)` : `url(#${gradientId}-g)`} />

        <path
          d={S_PATH}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/25" />
    </div>
  );
}
