import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type ReadoutTone =
  "primary" | "signal" | "go" | "caution" | "abort" | "info" | "muted";

const TONES: Record<ReadoutTone, string> = {
  primary: "text-bone-100",
  signal: "text-signal",
  go: "text-go",
  caution: "text-caution",
  abort: "text-abort",
  info: "text-info",
  muted: "text-mute-500",
};

export interface ReadoutProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  /** Units are part of the number: `pts`, `s`, `%`. */
  unit?: ReactNode;
  tone?: ReadoutTone;
  align?: "left" | "center";
  children?: never;
}

/**
 * An instrument readout, not a stat card: mono label above a large mono value.
 * Tone colours the value only.
 */
export function Readout({
  label,
  value,
  unit,
  tone = "primary",
  align = "left",
  className,
  ...rest
}: ReadoutProps) {
  return (
    <div
      className={cn("p-4", align === "center" && "text-center", className)}
      {...rest}
    >
      <div className="mb-3 label-mono text-mute-500">{label}</div>
      <div
        className={cn(
          "flex items-baseline gap-2",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <span
          className={cn(
            "font-mono text-3xl font-medium leading-none tracking-tight",
            TONES[tone],
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs uppercase tracking-mono text-mute-500">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
