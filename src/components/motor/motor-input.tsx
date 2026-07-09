import * as React from "react";

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
        "relative inline-flex w-fit max-w-max items-center overflow-hidden rounded-lg",
        "bg-gradient-to-r from-[#00f5a0] via-[#00d9f5] via-[59.135%] to-[#bfb9fb] to-[88.462%]",
        "py-2 pl-3 pr-3",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-[10px]">
        <AiChatIcon className="h-[22.895px] w-[24.163px] shrink-0" />
        <span className="block whitespace-nowrap text-lg font-semibold leading-[23px] tracking-[0.5px] text-black">
          {label}
        </span>
      </div>
    </div>
  );
}
