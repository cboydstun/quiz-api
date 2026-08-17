import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type LabelTone = "muted" | "secondary" | "primary" | "signal";

const TONES: Record<LabelTone, string> = {
  muted: "text-mute-500",
  secondary: "text-mute-400",
  primary: "text-bone-100",
  signal: "text-signal",
};

export interface LabelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: LabelTone;
  /** The `///` survey tag, always rendered in signal. */
  tag?: ReactNode;
  children?: ReactNode;
}

/**
 * The mono uppercase micro-label used everywhere a small heading used to be.
 * Never a sentence — one or two words.
 */
export function Label({
  tone = "muted",
  tag,
  className,
  children,
  ...rest
}: LabelProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 label-mono",
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {tag && <span className="text-signal">{tag}</span>}
      <span>{children}</span>
    </div>
  );
}
