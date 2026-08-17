import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type PanelTone = "panel" | "raised" | "inset" | "base";
export type PanelPadding = "none" | "sm" | "md" | "lg";

const TONES: Record<PanelTone, string> = {
  panel: "bg-ink-800",
  raised: "bg-ink-700",
  inset: "bg-ink-950",
  base: "bg-ink-900",
};

const PADDING: Record<PanelPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-8",
};

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  /** The `///` survey tag rendered in signal beside the label. */
  tag?: ReactNode;
  meta?: ReactNode;
  padding?: PanelPadding;
  tone?: PanelTone;
  /** Steps the hairline up to `line-strong` on hover. */
  interactive?: boolean;
  /** The 8px survey mark in the top-right corner. */
  corner?: boolean;
  children?: ReactNode;
}

export function Panel({
  label,
  tag,
  meta,
  padding = "md",
  tone = "panel",
  interactive = false,
  corner = true,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className={cn(
        "relative border border-line-hairline text-bone-100 transition-fast",
        TONES[tone],
        corner && "panel-bracket",
        interactive && "hover:border-line-strong",
        className,
      )}
      {...rest}
    >
      {(label || meta) && (
        <div className="flex items-center justify-between gap-4 border-b border-line-hairline px-4 py-3">
          <div className="flex items-center gap-2 label-mono text-mute-400">
            {tag && <span className="text-signal">{tag}</span>}
            {label}
          </div>
          {meta && <div className="label-mono text-mute-500">{meta}</div>}
        </div>
      )}
      <div className={PADDING[padding]}>{children}</div>
    </div>
  );
}
