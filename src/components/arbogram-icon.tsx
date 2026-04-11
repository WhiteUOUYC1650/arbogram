
import { cn } from "@/lib/utils";

interface ArbogramIconProps {
  className?: string;
}

export function ArbogramIcon({ className }: ArbogramIconProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={cn("overflow-hidden rounded-2xl shadow-lg", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Stripes */}
      <rect width="100" height="33.3" fill="#FFED00" />
      <rect y="33.3" width="100" height="33.4" fill="#DA121A" />
      <rect y="66.7" width="100" height="33.3" fill="#0051A5" />
      
      {/* Paper Plane Overlay */}
      <path 
        d="M20 45 L80 15 L50 85 L45 55 L20 45 Z" 
        fill="white" 
        stroke="black" 
        strokeWidth="4" 
        strokeLinejoin="round" 
        transform="translate(0, 5) scale(0.9) rotate(-10, 50, 50)"
      />
      <path 
        d="M45 55 L80 15" 
        fill="none" 
        stroke="black" 
        strokeWidth="3" 
        strokeLinecap="round"
        transform="translate(0, 5) scale(0.9) rotate(-10, 50, 50)"
      />
    </svg>
  );
}
