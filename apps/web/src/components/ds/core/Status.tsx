import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type StatusTone =
  "go" | "caution" | "abort" | "info" | "signal" | "neutral";

const TONES: Record<StatusTone, { text: string; dot: string; fill: string }> = {
  go: { text: "text-go", dot: "bg-go", fill: "bg-go-wash border-go" },
  caution: {
    text: "text-caution",
    dot: "bg-caution",
    fill: "bg-caution-wash border-caution",
  },
  abort: {
    text: "text-abort",
    dot: "bg-abort",
    fill: "bg-abort-wash border-abort",
  },
  info: { text: "text-info", dot: "bg-info", fill: "bg-info-wash border-info" },
  signal: {
    text: "text-signal",
    dot: "bg-signal",
    fill: "bg-signal-wash border-signal",
  },
  neutral: {
    text: "text-mute-400",
    dot: "bg-mute-400",
    fill: "bg-transparent border-mute-400",
  },
};

export interface StatusProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  dot?: boolean;
  filled?: boolean;
  children?: ReactNode;
}

/** The annunciator chip: GO / CAUTION / FAULT / NOTICE, CORRECT / MISSED. */
export function Status({
  tone = "neutral",
  dot = true,
  filled = false,
  className,
  children,
  ...rest
}: StatusProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2 py-1",
        "font-mono text-3xs uppercase tracking-label",
        t.text,
        filled ? t.fill : "border-line-hairline bg-transparent",
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn("inline-block size-[5px]", t.dot)} />}
      {children}
    </span>
  );
}
