import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { AiChatIcon } from "./ai-chat-icon";

export interface MotorInputProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  /** 展示文案，Figma 默认为 AIchat */
  label?: string;
}

/**
 * Figma MotorInput 组件封装
 *
 * Auto Layout（严格还原）:
 * - 外层: horizontal, items-center, py-8px, pl-12px, pr-16px
 * - 内层: horizontal, items-center, gap-10px
 * - 文本区: vertical, items-start, gap-3px
 */
export function MotorInput({
  className,
  label = "AIchat",
  ...rest
}: MotorInputProps) {
  return (
    <div
      data-name="MotorInput"
      role="group"
      aria-label={label}
      className={cn(
        "relative inline-flex items-center overflow-hidden rounded-lg",
        "bg-gradient-to-r from-[#00f5a0] via-[#00d9f5] via-[59.135%] to-[#bfb9fb] to-[88.462%]",
        "py-2 pl-3 pr-4",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-[10px]">
        <AiChatIcon className="h-[22.895px] w-[24.163px] shrink-0" />
        <div className="flex flex-col items-start gap-[3px]">
          <Input
            readOnly
            tabIndex={-1}
            value={label}
            aria-label={label}
            className={cn(
              "h-auto w-auto border-0 bg-transparent p-0 shadow-none",
              "pointer-events-none",
              "text-lg leading-[23px] font-semibold tracking-[0.5px] text-black",
              "focus-visible:border-0 focus-visible:ring-0",
            )}
          />
        </div>
      </div>
    </div>
  );
}
