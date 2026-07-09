import * as React from "react";
import { cn } from "@/lib/utils";

/** AIchat sparkle icon (inline SVG, matches Figma export) */
export function AiChatIcon({ className, ...rest }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 25 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      aria-hidden="true"
      {...rest}
    >
      {/* big four-point sparkle */}
      <path
        d="M13 1.5 L14.6 8.3 L21.4 9.9 L14.6 11.5 L13 18.3 L11.4 11.5 L4.6 9.9 L11.4 8.3 Z"
        fill="#111"
      />
      {/* small sparkle top-right */}
      <path
        d="M20.5 2.5 L21.2 4.6 L23.3 5.3 L21.2 6.0 L20.5 8.1 L19.8 6.0 L17.7 5.3 L19.8 4.6 Z"
        fill="#111"
      />
      {/* small sparkle bottom-left */}
      <path
        d="M5 15 L5.6 16.8 L7.4 17.4 L5.6 18 L5 19.8 L4.4 18 L2.6 17.4 L4.4 16.8 Z"
        fill="#111"
      />
    </svg>
  );
}
