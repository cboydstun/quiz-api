import { cn } from "@/components/ds";

export interface RouteStripProps {
  /** Total legs on today's route. */
  total: number;
  /** 0-based index of the leg being flown. */
  current: number;
  /**
   * Where the aircraft actually is, in legs, as a fraction — `engine.ts`'s
   * `routePosition`. Defaults to `current`, which is the leg node it sits on.
   */
  position?: number;
  /** Which legs are hazards, by 0-based index. */
  hazards?: boolean[];
  className?: string;
}

/**
 * Where you are on the route, always visible while flying.
 *
 * Distinct from `QuestionCard`'s progress bar, which counts questions inside a
 * leg. This counts legs, and it is the only thing on the question screen that
 * answers "how much of this is left".
 *
 * The nodes are decorative; the strip carries the position as a label so it is
 * available without the picture.
 *
 * The aircraft rides above the rail rather than on it. The current node is
 * already signal-coloured, so a mark sitting on the line would occlude it at
 * every leg start: nodes on the line, aircraft over it.
 */
export function RouteStrip({
  total,
  current,
  position,
  hazards = [],
  className,
}: RouteStripProps) {
  // Legs are points, so the filled rail spans the gaps between them.
  const at = position ?? current;
  const pct = total > 1 ? (at / (total - 1)) * 100 : 100;

  return (
    <div
      className={cn("relative pt-4", className)}
      role="group"
      aria-label={`Leg ${current + 1} of ${total}`}
    >
      <div className="relative flex items-center" aria-hidden>
        {/* The rail, and the part of it already flown. Width transitions on a
            token, so a crossing draws rather than jumps. */}
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink-600" />
        <span
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-signal transition-[width] duration-[var(--duration-base)] ease-default"
          style={{ width: `${pct}%` }}
        />

        {/*
          The aircraft, at the leading edge of what has been flown. Same mark as
          the crossing screen's profile — a mark rather than a picture, because
          at this size a drawing of a quadcopter is four grey pixels.

          `left` transitions on the same token as the rail below it, so the two
          move as one thing. No new keyframe: a token means reduced motion is
          already covered.
        */}
        <span
          data-testid="route-marker"
          className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-[14px] transition-[left] duration-[var(--duration-base)] ease-default"
          style={{ left: `${pct}%` }}
        >
          <svg width="12" height="8" viewBox="-6 -4 12 8" className="block">
            <path
              d="M-4 0 L4 0 M0 -3 L0 3 M-4 -3 L-4 3 M4 -3 L4 3"
              stroke="var(--color-signal)"
              strokeWidth={1.5}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </span>

        <div className="relative flex w-full items-center justify-between">
          {Array.from({ length: total }, (_, i) => {
            const flown = i < current;
            const here = i === current;
            return (
              <span
                key={i}
                data-testid="route-node"
                data-state={here ? "current" : flown ? "flown" : "pending"}
                className={cn(
                  "h-2 w-2 transition-fast",
                  here
                    ? "bg-signal"
                    : flown
                      ? hazards[i]
                        ? "bg-abort"
                        : "bg-mute-600"
                      : "bg-ink-600",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
