
"use client";

import { cn } from "@/lib/utils";

interface ArbogramIconProps {
  className?: string;
}

export function ArbogramIcon({ className }: ArbogramIconProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={cn("overflow-hidden rounded-2xl shadow-lg aspect-square shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background Stripes (Yellow, Red, Blue) */}
      <rect width="100" height="33.3" fill="#FFED00" />
      <rect y="33.3" width="100" height="33.4" fill="#DA121A" />
      <rect y="66.7" width="100" height="33.3" fill="#0051A5" />
      
      {/* Paper Plane Overlay - centered and properly scaled */}
      <g transform="translate(50, 50) rotate(-10)">
        <path 
          d="M-30,-5 L30,-35 L0,35 L-5,5 L-30,-5 Z" 
          fill="white" 
          stroke="black" 
          strokeWidth="4" 
          strokeLinejoin="round" 
        />
        <path 
          d="M-5,5 L30,-35" 
          fill="none" 
          stroke="black" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
