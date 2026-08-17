import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type AlertTone = "abort" | "caution" | "go" | "info";

/** Each tone carries the annunciator word it defaults its kicker to. */
const TONES: Record<
  AlertTone,
  { wash: string; edge: string; text: string; kicker: string }
> = {
  abort: {
    wash: "bg-abort-wash",
    edge: "border-l-abort",
    text: "text-abort",
    kicker: "FAULT",
  },
  caution: {
    wash: "bg-caution-wash",
    edge: "border-l-caution",
    text: "text-caution",
    kicker: "CAUTION",
  },
  go: {
    wash: "bg-go-wash",
    edge: "border-l-go",
    text: "text-go",
    kicker: "CONFIRMED",
  },
  info: {
    wash: "bg-info-wash",
    edge: "border-l-info",
    text: "text-info",
    kicker: "NOTICE",
  },
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  /** Overrides the tone's annunciator word. */
  kicker?: ReactNode;
  /** Renders a dismiss control. Omit for an alert the user cannot clear. */
  onDismiss?: () => void;
  children?: ReactNode;
}

export function Alert({
  tone = "abort",
  kicker,
  onDismiss,
  className,
  children,
  ...rest
}: AlertProps) {
  const t = TONES[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-4 border border-line-hairline border-l-2 px-4 py-3",
        "font-display text-sm text-bone-100",
        t.wash,
        t.edge,
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "pt-0.5 font-mono text-3xs tracking-label whitespace-nowrap",
          t.text,
        )}
      >
        {kicker ?? t.kicker}
      </span>
      <span className="grow">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="label-mono text-mute-500 transition-fast hover:text-bone-100 focus-signal cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}
