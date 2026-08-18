import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export type MeterTone = "signal" | "go" | "caution" | "abort" | "info";

const TONES: Record<MeterTone, { text: string; fill: string }> = {
  signal: { text: "text-signal", fill: "bg-signal" },
  go: { text: "text-go", fill: "bg-go" },
  caution: { text: "text-caution", fill: "bg-caution" },
  abort: { text: "text-abort", fill: "bg-abort" },
  info: { text: "text-info", fill: "bg-info" },
};

/** Segments in the bar. Ten reads as a percentage without needing the number. */
const SEGMENTS = 10;

export interface MeterProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: ReactNode;
  /** 0-100. Values outside the range are clamped rather than overflowing. */
  value: number;
  /**
   * Fixed tone. Omit to let the meter colour itself by level — go above 60,
   * caution above 25, abort below. A depleting resource says more by its
   * colour than by its number.
   */
  tone?: MeterTone;
  /** Replaces the percentage on the right, e.g. "2h" for a clock. */
  readout?: ReactNode;
}

function toneFor(value: number): MeterTone {
  if (value > 60) return "go";
  if (value > 25) return "caution";
  return "abort";
}

/**
 * A segmented resource bar: mono label, segments, mono value.
 *
 * **An extrapolation, not in the source design.** The system ships `Readout`
 * for an instrument number and `Status` for a state lamp, but nothing that
 * shows a quantity draining — which is the whole subject of a trail run. It is
 * built from the system's own parts rather than as a new pattern: square
 * segments on the hairline grid, no rounding, no gradient, no track fill
 * animation beyond `transition-fast`. Discrete segments rather than a
 * continuous bar because a continuous one is a progress bar, and this is an
 * instrument.
 *
 * `role="meter"` rather than `progressbar`: a battery is a level, not progress
 * towards completion.
 */
export function Meter({
  label,
  value,
  tone,
  readout,
  className,
  ...rest
}: MeterProps) {
  const level = Math.max(0, Math.min(100, value));
  const palette = TONES[tone ?? toneFor(level)];
  // Ceil so any charge at all shows one lit segment. A bar reading empty while
  // the run continues is a bug the user can see.
  const lit = level === 0 ? 0 : Math.max(1, Math.ceil((level / 100) * SEGMENTS));

  return (
    <div className={cn("p-4", className)} {...rest}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="label-mono text-mute-500">{label}</span>
        <span className={cn("font-mono text-xs tracking-mono", palette.text)}>
          {readout ?? `${Math.round(level)}%`}
        </span>
      </div>
      <div
        role="meter"
        // No useId here: every other core component is server-safe, and a hook
        // would force "use client" on a bar. A string label names it directly;
        // a rendered one is left to the visible text beside it.
        aria-label={typeof label === "string" ? label : undefined}
        aria-valuenow={Math.round(level)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="flex gap-px"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 transition-fast",
              i < lit ? palette.fill : "bg-ink-600",
            )}
            /*
              Segments change in sequence rather than together, counted from
              the right, so a drop reads as the lit end burning back instead of
              the whole bar blinking to a new length.

              The delay is expressed in a duration token, not a raw number, so
              the prefers-reduced-motion block that zeroes the tokens takes the
              stagger with it — a 0ms transition with a 200ms delay would still
              animate, just worse.
            */
            style={{
              transitionDelay: `calc(var(--duration-instant) * 0.3 * ${
                SEGMENTS - 1 - i
              })`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
